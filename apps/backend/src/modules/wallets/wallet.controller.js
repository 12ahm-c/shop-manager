const { z } = require('zod');
const mongoose = require('mongoose');
const Wallet = require('./wallet.model');
const WalletTransaction = require('./walletTransaction.model');
const Log = require('../admin/log.model');
const Notification = require('../notifications/notification.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const createWalletSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'bank', 'ccp', 'mobile_money', 'customer_deposit']),
  currency: z.string().optional(),
  minBalance: z.number().min(0).optional()
});

const create = async (req, res, next) => {
  try {
    const parsedData = createWalletSchema.parse(req.body);
    const storeId = req.user.storeId;

    const wallet = await Wallet.create({
      ...parsedData,
      storeId,
      currency: parsedData.currency || 'MRU'
    });

    return sendSuccess(res, wallet, null, 201);
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
    const wallets = await Wallet.find({ storeId, isActive: true }).lean();
    return sendSuccess(res, wallets);
  } catch (error) {
    next(error);
  }
};

const transferSchema = z.object({
  fromWalletId: z.string().min(1, 'Source wallet ID is required'),
  toWalletId: z.string().min(1, 'Destination wallet ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional().default('')
});

const transfer = async (req, res, next) => {
  try {
    const parsedBody = transferSchema.parse(req.body);
    const storeId = req.user.storeId;

    if (parsedBody.fromWalletId === parsedBody.toWalletId) {
      return sendError(res, 'VALIDATION_ERROR', 'Cannot transfer to the same wallet', { toWalletId: 'Must be different from source' }, 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const fromWallet = await Wallet.findOne({ _id: parsedBody.fromWalletId, storeId, isActive: true }).session(session);
      if (!fromWallet) {
        throw Object.assign(new Error('Source wallet not found'), { status: 404, code: 'NOT_FOUND' });
      }
      if (fromWallet.balance < parsedBody.amount) {
        throw Object.assign(
          new Error(`Insufficient balance in "${fromWallet.name}". Available: ${fromWallet.balance}, required: ${parsedBody.amount}`),
          { status: 422, code: 'INSUFFICIENT_BALANCE' }
        );
      }

      const toWallet = await Wallet.findOne({ _id: parsedBody.toWalletId, storeId, isActive: true }).session(session);
      if (!toWallet) {
        throw Object.assign(new Error('Destination wallet not found'), { status: 404, code: 'NOT_FOUND' });
      }

      const updatedFrom = await Wallet.findByIdAndUpdate(
        fromWallet._id,
        { $inc: { balance: -parsedBody.amount } },
        { new: true, session }
      );

      const updatedTo = await Wallet.findByIdAndUpdate(
        toWallet._id,
        { $inc: { balance: parsedBody.amount } },
        { new: true, session }
      );

      await WalletTransaction.create([{
        storeId,
        walletId: fromWallet._id,
        type: 'transfer',
        amount: -parsedBody.amount,
        balanceAfter: updatedFrom.balance,
        reference: toWallet._id.toString(),
        description: parsedBody.description || `Transfer to "${toWallet.name}"`,
        userId: req.user.id
      }], { session });

      await WalletTransaction.create([{
        storeId,
        walletId: toWallet._id,
        type: 'transfer',
        amount: parsedBody.amount,
        balanceAfter: updatedTo.balance,
        reference: fromWallet._id.toString(),
        description: parsedBody.description || `Transfer from "${fromWallet.name}"`,
        userId: req.user.id
      }], { session });

      await Log.create([{
        storeId,
        userId: req.user.id,
        action: 'payment',
        entity: 'Wallet',
        entityId: fromWallet._id,
        details: {
          fromWallet: fromWallet.name,
          toWallet: toWallet.name,
          amount: parsedBody.amount,
          description: parsedBody.description
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      const io = require('../../app').getIO();
      if (io) {
        io.to(`admin:${storeId}`).emit('dashboard:update', { storeId });
      }

      if (updatedFrom.balance <= fromWallet.minBalance) {
        await Notification.create({
          storeId,
          type: 'low_wallet',
          message: `Wallet "${fromWallet.name}" balance (${updatedFrom.balance}) is at or below minimum (${fromWallet.minBalance})`,
          targetRole: 'admin',
          relatedEntity: { walletId: fromWallet._id }
        });
        if (io) {
          io.to(`admin:${storeId}`).emit('alert:low_wallet', {
            walletId: fromWallet._id,
            balance: updatedFrom.balance,
            minBalance: fromWallet.minBalance
          });
        }
      }

      return sendSuccess(res, {
        fromWallet: { _id: fromWallet._id, name: fromWallet.name, balance: updatedFrom.balance },
        toWallet: { _id: toWallet._id, name: toWallet.name, balance: updatedTo.balance },
        amount: parsedBody.amount
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

const getTransactions = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const walletId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursor = req.query.cursor || null;

    const wallet = await Wallet.findOne({ _id: walletId, storeId });
    if (!wallet) {
      return sendError(res, 'NOT_FOUND', 'Wallet not found', null, 404);
    }

    const filter = { walletId, storeId };
    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const transactions = await WalletTransaction.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = transactions.length > limit;
    if (hasMore) transactions.pop();

    const nextCursor = hasMore ? transactions[transactions.length - 1]._id : null;

    return sendSuccess(res, transactions, {
      limit,
      nextCursor,
      hasMore
    });
  } catch (error) {
    next(error);
  }
};

const reconcileSchema = z.object({
  closingBalance: z.number('Closing balance is required'),
  notes: z.string().optional().default('')
});

const reconcile = async (req, res, next) => {
  try {
    const parsedBody = reconcileSchema.parse(req.body);
    const storeId = req.user.storeId;
    const walletId = req.params.id;

    const wallet = await Wallet.findOne({ _id: walletId, storeId });
    if (!wallet) {
      return sendError(res, 'NOT_FOUND', 'Wallet not found', null, 404);
    }

    wallet.lastReconciliation = new Date();
    await wallet.save();

    await Log.create([{
      storeId,
      userId: req.user.id,
      action: 'settings_change',
      entity: 'Wallet',
      entityId: wallet._id,
      details: {
        closingBalance: parsedBody.closingBalance,
        currentBalance: wallet.balance,
        notes: parsedBody.notes,
        reconciliationDate: wallet.lastReconciliation
      }
    }]);

    return sendSuccess(res, {
      walletId: wallet._id,
      lastReconciliation: wallet.lastReconciliation,
      closingBalance: parsedBody.closingBalance,
      currentBalance: wallet.balance
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', error.errors, 400);
    }
    next(error);
  }
};

module.exports = { create, list, transfer, getTransactions, reconcile };
