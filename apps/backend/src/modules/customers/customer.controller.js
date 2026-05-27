const { z } = require('zod');
const mongoose = require('mongoose');
const Customer = require('./customer.model');
const Sale = require('../sales/sale.model');
const Wallet = require('../wallets/wallet.model');
const WalletTransaction = require('../wallets/walletTransaction.model');
const Store = require('../stores/store.model');
const Log = require('../admin/log.model');
const Notification = require('../notifications/notification.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  birthDate: z.string().optional().nullable(),
  allergies: z.string().optional(),
  notes: z.string().optional()
});

const create = async (req, res, next) => {
  try {
    const parsedData = createCustomerSchema.parse(req.body);
    const storeId = req.user.storeId;

    const existing = await Customer.findOne({ storeId, phone: parsedData.phone });
    if (existing) {
      return sendError(res, 'DUPLICATE_ENTRY', 'A customer with this phone already exists in this store', null, 409);
    }

    const customer = await Customer.create({
      ...parsedData,
      storeId,
      birthDate: parsedData.birthDate ? new Date(parsedData.birthDate) : null
    });

    return sendSuccess(res, customer, null, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', error.errors, 400);
    }
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const q = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { storeId };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter)
    ]);

    return sendSuccess(res, customers, {
      page, limit, total,
      hasMore: skip + customers.length < total
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const customer = await Customer.findOne({ _id: req.params.id, storeId }).lean();
    if (!customer) {
      return sendError(res, 'NOT_FOUND', 'Customer not found', null, 404);
    }

    const recentSales = await Sale.find({ customerId: customer._id, storeId })
      .sort({ saleDate: -1 })
      .limit(10)
      .lean();

    return sendSuccess(res, { customer, recentSales });
  } catch (error) {
    next(error);
  }
};

const payDebtSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  walletId: z.string().min(1, 'Wallet ID is required')
});

const payDebt = async (req, res, next) => {
  try {
    const parsedBody = payDebtSchema.parse(req.body);
    const storeId = req.user.storeId;
    const customerId = req.params.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const customer = await Customer.findOne({ _id: customerId, storeId }).session(session);
      if (!customer) {
        throw Object.assign(new Error('Customer not found'), { status: 404, code: 'NOT_FOUND' });
      }
      if (customer.currentDebt < parsedBody.amount) {
        throw Object.assign(
          new Error(`Customer debt (${customer.currentDebt}) is less than payment amount (${parsedBody.amount})`),
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

      await Customer.findByIdAndUpdate(
        customer._id,
        { $inc: { currentDebt: -parsedBody.amount } },
        { session }
      );

      await WalletTransaction.create([{
        storeId,
        walletId: wallet._id,
        type: 'debit',
        amount: parsedBody.amount,
        balanceAfter: updatedWallet.balance,
        reference: customer._id.toString(),
        description: `Debt payment for ${customer.name}`,
        userId: req.user.id
      }], { session });

      await Log.create([{
        storeId,
        userId: req.user.id,
        action: 'payment',
        entity: 'Customer',
        entityId: customer._id,
        details: { amount: parsedBody.amount, walletId: wallet._id, customerName: customer.name }
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
        customerId: customer._id,
        amountPaid: parsedBody.amount,
        remainingDebt: Math.max(0, customer.currentDebt - parsedBody.amount),
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

const getOverdue = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const debtors = await Customer.find({ storeId, currentDebt: { $gt: 0 } })
      .sort({ currentDebt: -1 })
      .lean();

    const now = new Date();
    const enriched = [];
    for (const customer of debtors) {
      const lastSale = await Sale.findOne({ customerId: customer._id, storeId })
        .sort({ saleDate: -1 })
        .select('saleDate')
        .lean();

      const lastSaleDate = lastSale?.saleDate || customer.createdAt;
      const daysSinceLastSale = Math.floor((now - new Date(lastSaleDate)) / (1000 * 60 * 60 * 24));

      let agingBucket = '0-30';
      if (daysSinceLastSale > 60) agingBucket = '60+';
      else if (daysSinceLastSale > 45) agingBucket = '45-60';
      else if (daysSinceLastSale > 30) agingBucket = '30-45';

      enriched.push({
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        currentDebt: customer.currentDebt,
        creditLimit: customer.creditLimit,
        lastSaleDate,
        daysSinceLastSale,
        agingBucket
      });
    }

    const total = enriched.length;
    const paginated = enriched.slice(skip, skip + limit);

    return sendSuccess(res, paginated, {
      page, limit, total,
      hasMore: skip + paginated.length < total
    });
  } catch (error) {
    next(error);
  }
};

const redeemLoyaltySchema = z.object({
  points: z.number().int().positive('Points must be a positive integer'),
  saleId: z.string().optional()
});

const redeemLoyalty = async (req, res, next) => {
  try {
    const parsedBody = redeemLoyaltySchema.parse(req.body);
    const storeId = req.user.storeId;
    const customerId = req.params.id;

    const customer = await Customer.findOne({ _id: customerId, storeId });
    if (!customer) {
      return sendError(res, 'NOT_FOUND', 'Customer not found', null, 404);
    }
    if (customer.loyaltyPoints < parsedBody.points) {
      return sendError(
        res,
        'INSUFFICIENT_POINTS',
        `Customer has ${customer.loyaltyPoints} points but ${parsedBody.points} requested`,
        null,
        422
      );
    }

    const store = await Store.findById(storeId);
    const redeemRate = store?.settings?.loyaltyRedeemRate || 1;
    const discountAmount = parsedBody.points * redeemRate;

    if (parsedBody.saleId) {
      return sendSuccess(res, {
        customerId: customer._id,
        customerName: customer.name,
        pointsRequested: parsedBody.points,
        redeemRate,
        discountAmount,
        availablePoints: customer.loyaltyPoints,
        preview: true
      });
    }

    await Customer.findByIdAndUpdate(
      customer._id,
      { $inc: { loyaltyPoints: -parsedBody.points } }
    );

    await Log.create([{
      storeId,
      userId: req.user.id,
      action: 'payment',
      entity: 'Customer',
      entityId: customer._id,
      details: { loyaltyRedeemed: parsedBody.points, discountAmount, customerName: customer.name }
    }]);

    return sendSuccess(res, {
      customerId: customer._id,
      customerName: customer.name,
      pointsRedeemed: parsedBody.points,
      discountAmount,
      remainingPoints: customer.loyaltyPoints - parsedBody.points,
      preview: false
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', error.errors, 400);
    }
    next(error);
  }
};

module.exports = { create, search, getById, payDebt, getOverdue, redeemLoyalty };
