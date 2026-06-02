const mongoose = require('mongoose');
const Sale = require('../sales/sale.model');
const Wallet = require('../wallets/wallet.model');
const Customer = require('../customers/customer.model');
const Supplier = require('../suppliers/supplier.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const dailyCash = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const startDate = new Date(dateStr + 'T00:00:00.000Z');
    const endDate = new Date(dateStr + 'T23:59:59.999Z');

    const salesAgg = await Sale.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$totalAmount' },
          totalProfit: { $sum: { $sum: '$items.profit' } }
        }
      }
    ]);

    const breakdown = { cash: 0, card: 0, credit: 0, mixed: 0, count: 0 };
    let totalAmount = 0;
    let totalProfit = 0;
    for (const group of salesAgg) {
      breakdown[group._id] = group.total;
      breakdown.count += group.count;
      totalAmount += group.total;
      totalProfit += group.totalProfit;
    }

    const wallets = await Wallet.find({ storeId, isActive: true })
      .select('name type balance')
      .lean();

    return sendSuccess(res, {
      date: dateStr,
      totalSales: breakdown.count,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      paymentMethodBreakdown: {
        cash: Math.round(breakdown.cash * 100) / 100,
        card: Math.round(breakdown.card * 100) / 100,
        credit: Math.round(breakdown.credit * 100) / 100,
        mixed: Math.round(breakdown.mixed * 100) / 100
      },
      walletBalances: wallets.map(w => ({ name: w.name, type: w.type, balance: w.balance }))
    });
  } catch (error) {
    next(error);
  }
};

const profitability = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return sendError(res, 'VALIDATION_ERROR', 'startDate and endDate are required', null, 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const sales = await Sale.find({
      storeId,
      saleDate: { $gte: start, $lte: end },
      status: 'completed'
    }).lean();

    let totalRevenue = 0;
    let totalCost = 0;
    let totalVat = 0;
    let totalDiscount = 0;
    const categoryMap = {};

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalVat += sale.vatAmount || 0;
      totalDiscount += sale.discount || 0;
      for (const item of sale.items) {
        totalCost += item.quantity * item.purchasePrice;
        const product = await mongoose.model('Product').findById(item.productId).select('category').lean();
        const category = product?.category || 'Uncategorized';
        if (!categoryMap[category]) categoryMap[category] = { revenue: 0, cost: 0, profit: 0 };
        categoryMap[category].revenue += item.subtotal;
        categoryMap[category].cost += item.quantity * item.purchasePrice;
        categoryMap[category].profit += item.profit || 0;
      }
    }

    const totalProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0;

    const categories = Object.entries(categoryMap).map(([name, data]) => ({
      category: name,
      revenue: Math.round(data.revenue * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      profit: Math.round(data.profit * 100) / 100,
      marginPercent: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 10000) / 100 : 0
    }));

    return sendSuccess(res, {
      period: { startDate, endDate },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        marginPercent,
        totalVat: Math.round(totalVat * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalSales: sales.length
      },
      byCategory: categories
    });
  } catch (error) {
    next(error);
  }
};

const topProducts = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const { startDate, endDate } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const match = { storeId, status: 'completed' };
    if (startDate || endDate) {
      match.saleDate = {};
      if (startDate) match.saleDate.$gte = new Date(startDate);
      if (endDate) match.saleDate.$lte = new Date(endDate);
    }

    const results = await Sale.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), status: 'completed', ...(match.saleDate ? { saleDate: match.saleDate } : {}) } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          totalProfit: { $sum: '$items.profit' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ['$product.name', 'Deleted Product'] },
          category: '$product.category',
          totalQuantity: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalProfit: { $round: ['$totalProfit', 2] }
        }
      }
    ]);

    return sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
};

const aging = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const now = new Date();

    const customers = await Customer.find({ storeId, currentDebt: { $gt: 0 } }).lean();
    const suppliers = await Supplier.find({ storeId, currentDebt: { $gt: 0 } }).lean();

    const getBucket = (date) => {
      const days = Math.floor((now - new Date(date)) / (1000 * 60 * 60 * 24));
      if (days <= 30) return '0-30';
      if (days <= 45) return '30-45';
      if (days <= 60) return '45-60';
      return '60+';
    };

    const bucketNames = ['0-30', '30-45', '45-60', '60+'];

    const customerBuckets = {};
    for (const name of bucketNames) customerBuckets[name] = { count: 0, total: 0 };

    for (const c of customers) {
      const lastSale = await Sale.findOne({ customerId: c._id, storeId }).sort({ saleDate: -1 }).select('saleDate').lean();
      const refDate = lastSale?.saleDate || c.createdAt;
      const bucket = getBucket(refDate);
      customerBuckets[bucket].count += 1;
      customerBuckets[bucket].total += c.currentDebt;
    }

    const supplierBuckets = {};
    for (const name of bucketNames) supplierBuckets[name] = { count: 0, total: 0 };

    for (const s of suppliers) {
      const refDate = s.updatedAt || s.createdAt;
      const bucket = getBucket(refDate);
      supplierBuckets[bucket].count += 1;
      supplierBuckets[bucket].total += s.currentDebt;
    }

    return sendSuccess(res, {
      customers: {
        buckets: Object.entries(customerBuckets).map(([bucket, data]) => ({
          bucket,
          count: data.count,
          total: Math.round(data.total * 100) / 100
        })),
        total: customers.length
      },
      suppliers: {
        buckets: Object.entries(supplierBuckets).map(([bucket, data]) => ({
          bucket,
          count: data.count,
          total: Math.round(data.total * 100) / 100
        })),
        total: suppliers.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { dailyCash, profitability, topProducts, aging };
