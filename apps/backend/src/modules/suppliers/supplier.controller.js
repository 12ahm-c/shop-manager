const { z } = require('zod');
const mongoose = require('mongoose');
const Supplier = require('./supplier.model');
const Stock = require('../stock/stock.model');
const Wallet = require('../wallets/wallet.model');
const WalletTransaction = require('../wallets/walletTransaction.model');
const Log = require('../admin/log.model');
const Notification = require('../notifications/notification.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

const create = async (req, res, next) => {
  try {
    const parsedData = createSupplierSchema.parse(req.body);
    const storeId = req.user.storeId;

    const existing = await Supplier.findOne({ storeId, name: parsedData.name });
    if (existing) {
      return sendError(res, 'DUPLICATE_ENTRY', 'A supplier with this name already exists in this store', null, 409);
    }

    const supplier = await Supplier.create({ ...parsedData, storeId });

    await Log.create([{
      storeId,
      userId: req.user.id,
      action: 'import',
      entity: 'Supplier',
      entityId: supplier._id,
      details: { name: supplier.name, phone: supplier.phone }
    }]);

    return sendSuccess(res, supplier, null, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', error.errors, 400);
    }
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const q = req.query.q || '';

    const filter = { storeId };
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter)
    ]);

    const enriched = [];
    for (const supplier of suppliers) {
      const stockAgg = await Stock.aggregate([
        { $match: { storeId, supplierId: supplier._id } },
        { $group: { _id: null, totalPurchases: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } }
      ]);
      enriched.push({
        ...supplier,
        totalPurchases: stockAgg[0]?.totalPurchases || 0
      });
    }

    return sendSuccess(res, enriched, {
      page, limit, total,
      hasMore: skip + suppliers.length < total
    });
  } catch (error) {
    next(error);
  }
};

const getDebtDetail = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const supplier = await Supplier.findOne({ _id: req.params.id, storeId }).lean();
    if (!supplier) {
      return sendError(res, 'NOT_FOUND', 'Supplier not found', null, 404);
    }

    const recentReceipts = await Stock.find({ storeId, supplierId: supplier._id })
      .sort({ receptionDate: -1 })
      .limit(20)
      .populate('productId', 'name')
      .lean();

    return sendSuccess(res, { supplier, recentReceipts });
  } catch (error) {
    next(error);
  }
};

const payDebtSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  walletId: z.string().min(1, 'Wallet ID is required'),
  description: z.string().optional().default('')
});

const payDebt = async (req, res, next) => {
  try {
    const parsedBody = payDebtSchema.parse(req.body);
    const storeId = req.user.storeId;
    const supplierId = req.params.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const supplier = await Supplier.findOne({ _id: supplierId, storeId }).session(session);
      if (!supplier) {
        throw Object.assign(new Error('Supplier not found'), { status: 404, code: 'NOT_FOUND' });
      }
      if (supplier.currentDebt < parsedBody.amount) {
        throw Object.assign(
          new Error(`Supplier debt (${supplier.currentDebt}) is less than payment amount (${parsedBody.amount})`),
          { status: 422, code: 'INSUFFICIENT_BALANCE' }
        );
      }

      const wallet = await Wallet.findOne({ _id: parsedBody.walletId, storeId, isActive: true }).session(session);
      if (!wallet) {
        throw Object.assign(new Error('Wallet not found'), { status: 404, code: 'NOT_FOUND' });
      }
      if (wallet.balance < parsedBody.amount) {
        throw Object.assign(
          new Error(`Insufficient wallet balance. Available: ${wallet.balance}, required: ${parsedBody.amount}`),
          { status: 422, code: 'INSUFFICIENT_BALANCE' }
        );
      }

      const updatedWallet = await Wallet.findByIdAndUpdate(
        wallet._id,
        { $inc: { balance: -parsedBody.amount } },
        { new: true, session }
      );

      await Supplier.findByIdAndUpdate(
        supplier._id,
        { $inc: { currentDebt: -parsedBody.amount } },
        { session }
      );

      await WalletTransaction.create([{
        storeId,
        walletId: wallet._id,
        type: 'debit',
        amount: parsedBody.amount,
        balanceAfter: updatedWallet.balance,
        reference: supplier._id.toString(),
        description: parsedBody.description || `Supplier payment to ${supplier.name}`,
        userId: req.user.id
      }], { session });

      await Log.create([{
        storeId,
        userId: req.user.id,
        action: 'payment',
        entity: 'Supplier',
        entityId: supplier._id,
        details: { amount: parsedBody.amount, walletId: wallet._id, supplierName: supplier.name }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      const io = require('../../app').getIO();
      if (io) {
        io.to(`admin:${storeId}`).emit('dashboard:update', { storeId });
      }

      if (updatedWallet.balance <= wallet.minBalance) {
        await Notification.create({
          storeId,
          type: 'low_wallet',
          message: `Wallet "${wallet.name}" balance (${updatedWallet.balance}) is at or below minimum (${wallet.minBalance})`,
          targetRole: 'admin',
          relatedEntity: { walletId: wallet._id }
        });
        if (io) {
          io.to(`admin:${storeId}`).emit('alert:low_wallet', {
            walletId: wallet._id,
            balance: updatedWallet.balance,
            minBalance: wallet.minBalance
          });
        }
      }

      return sendSuccess(res, {
        supplierId: supplier._id,
        amountPaid: parsedBody.amount,
        remainingDebt: Math.max(0, supplier.currentDebt - parsedBody.amount),
        walletBalance: updatedWallet.balance
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', error.errors, 400);
    }
    if (error.status && error.code) {
      return sendError(res, error.code, error.message, null, error.status);
    }
    next(error);
  }
};

module.exports = { create, list, getDebtDetail, payDebt };
