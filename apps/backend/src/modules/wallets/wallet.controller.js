const { z } = require('zod');
const Wallet = require('./wallet.model');
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

module.exports = { create, list };
