const { z } = require('zod');
const mongoose = require('mongoose');
const Sale = require('./sale.model');
const Invoice = require('../invoices/invoice.model');
const { createSale, cancelSale } = require('./sale.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const createSaleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive()
  })).min(1, 'At least one item is required'),
  customerId: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'credit', 'mixed']),
  walletId: z.string().optional(),
  cashGiven: z.number().positive().optional(),
  useLoyaltyPoints: z.number().int().min(0).optional()
});

const create = async (req, res, next) => {
  try {
    const parsedData = createSaleSchema.parse(req.body);
    const result = await createSale(parsedData, req.user);
    return sendSuccess(res, result, null, 201);
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

const getDailySummary = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const cashierId = req.user.id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sales = await Sale.find({
      storeId,
      cashierId,
      saleDate: { $gte: startOfDay },
      status: 'completed'
    }).lean();

    let totalAmount = 0;
    let totalProfit = 0;
    const methodBreakdown = { cash: 0, card: 0, credit: 0, mixed: 0 };
    for (const sale of sales) {
      totalAmount += sale.totalAmount;
      methodBreakdown[sale.paymentMethod] = (methodBreakdown[sale.paymentMethod] || 0) + 1;
      for (const item of sale.items) {
        totalProfit += item.profit || 0;
      }
    }

    return sendSuccess(res, {
      totalSales: sales.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      paymentMethodBreakdown: methodBreakdown
    });
  } catch (error) {
    next(error);
  }
};

const getMyHistory = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const cashierId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      Sale.find({ storeId, cashierId })
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name phone')
        .lean(),
      Sale.countDocuments({ storeId, cashierId })
    ]);

    const resultSales = sales.map(sale => {
      if (req.user.role === 'employee') {
        sale.items = sale.items.map(item => {
          const { purchasePrice, profit, ...rest } = item;
          return rest;
        });
      }
      return sale;
    });

    return sendSuccess(res, resultSales, {
      page, limit, total,
      hasMore: skip + sales.length < total
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const sale = await Sale.findOne({ _id: req.params.id, storeId })
      .populate('customerId', 'name phone')
      .lean();
    if (!sale) {
      return sendError(res, 'NOT_FOUND', 'Sale not found', null, 404);
    }

    const invoice = await Invoice.findOne({ saleId: sale._id }).lean();

    if (req.user.role === 'employee') {
      sale.items = sale.items.map(item => {
        const { purchasePrice, profit, ...rest } = item;
        return rest;
      });
    }

    return sendSuccess(res, { sale, invoice });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { storeId };
    if (req.query.startDate || req.query.endDate) {
      filter.saleDate = {};
      if (req.query.startDate) filter.saleDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.saleDate.$lte = new Date(req.query.endDate);
    }
    if (req.query.cashierId) filter.cashierId = req.query.cashierId;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    if (req.query.status) filter.status = req.query.status;

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('cashierId', 'name')
        .populate('customerId', 'name phone')
        .lean(),
      Sale.countDocuments(filter)
    ]);

    return sendSuccess(res, sales, {
      page, limit, total,
      hasMore: skip + sales.length < total
    });
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const result = await cancelSale(req.params.id, req.user);
    return sendSuccess(res, result);
  } catch (error) {
    if (error.status && error.code) {
      return sendError(res, error.code, error.message, null, error.status);
    }
    next(error);
  }
};

module.exports = { create, getDailySummary, getMyHistory, getById, list, cancel };
