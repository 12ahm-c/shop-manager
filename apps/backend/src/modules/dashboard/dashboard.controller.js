const mongoose = require('mongoose');
const Sale = require('../sales/sale.model');
const Stock = require('../stock/stock.model');
const Customer = require('../customers/customer.model');
const Supplier = require('../suppliers/supplier.model');
const Wallet = require('../wallets/wallet.model');
const Invoice = require('../invoices/invoice.model');
const Notification = require('../notifications/notification.model');
const cacheService = require('../../services/cache.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const employee = async (req, res, next) => {
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
    const productSales = {};

    for (const sale of sales) {
      totalAmount += sale.totalAmount;
      methodBreakdown[sale.paymentMethod] = (methodBreakdown[sale.paymentMethod] || 0) + 1;
      for (const item of sale.items) {
        totalProfit += item.profit || 0;
        const key = item.productId.toString();
        if (!productSales[key]) productSales[key] = { productId: item.productId, quantity: 0, revenue: 0 };
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.subtotal;
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const populatedProducts = [];
    for (const p of topProducts) {
      const product = await mongoose.model('Product').findById(p.productId).select('name').lean();
      populatedProducts.push({
        productId: p.productId,
        name: product?.name || 'Deleted',
        quantity: p.quantity,
        revenue: Math.round(p.revenue * 100) / 100
      });
    }

    return sendSuccess(res, {
      totalSales: sales.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      paymentMethodBreakdown: methodBreakdown,
      topProducts: populatedProducts
    });
  } catch (error) {
    next(error);
  }
};

const admin = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const period = req.query.period || 'today';

    const cacheKey = cacheService.dashboardKey(storeId, period);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    let startDate;
    const now = new Date();
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        if (req.query.startDate) {
          startDate = new Date(req.query.startDate);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
    }

    const match = { storeId, status: 'completed' };
    if (startDate) match.saleDate = { $gte: startDate };

    const salesAgg = await Sale.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), status: 'completed', ...(match.saleDate ? { saleDate: match.saleDate } : {}) } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          totalSales: { $sum: 1 },
          totalProfit: { $sum: { $sum: '$items.profit' } }
        }
      }
    ]);

    const revenue = salesAgg[0]?.revenue || 0;
    const totalSales = salesAgg[0]?.totalSales || 0;
    const totalProfit = salesAgg[0]?.totalProfit || 0;

    const activeAlerts = await Notification.countDocuments({
      storeId,
      isRead: false,
      type: { $in: ['stock_critical', 'out_of_stock'] }
    });

    const totalCustomers = await Customer.countDocuments({ storeId });
    const totalDebtAgg = await Customer.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      { $group: { _id: null, total: { $sum: '$currentDebt' } } }
    ]);
    const totalDebt = totalDebtAgg[0]?.total || 0;

    const wallets = await Wallet.find({ storeId, isActive: true }).lean();
    const walletBalances = {};
    for (const w of wallets) {
      walletBalances[w.type] = (walletBalances[w.type] || 0) + w.balance;
    }

    const topProducts = await Sale.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), status: 'completed', ...(match.saleDate ? { saleDate: match.saleDate } : {}) } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', revenue: { $sum: '$items.subtotal' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, name: { $ifNull: ['$product.name', 'Deleted'] }, revenue: { $round: ['$revenue', 2] } } }
    ]);

    const result = {
      period,
      revenue: Math.round(revenue * 100) / 100,
      totalSales,
      totalProfit: Math.round(totalProfit * 100) / 100,
      activeStockAlerts: activeAlerts,
      totalCustomers,
      totalDebt: Math.round(totalDebt * 100) / 100,
      walletBalances,
      topProducts
    };

    await cacheService.set(cacheKey, result, 300);

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const financial = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;

    const cacheKey = cacheService.financialKey(storeId);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const salesAgg = await Sale.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), status: 'completed', saleDate: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          profit: { $sum: { $sum: '$items.profit' } }
        }
      }
    ]);

    const totalRevenue = salesAgg[0]?.revenue || 0;
    const totalProfit = salesAgg[0]?.profit || 0;
    const marginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0;

    const customerDebtAgg = await Customer.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      { $group: { _id: null, total: { $sum: '$currentDebt' } } }
    ]);
    const customerDebtTotal = customerDebtAgg[0]?.total || 0;

    const supplierDebtAgg = await Supplier.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      { $group: { _id: null, total: { $sum: '$currentDebt' } } }
    ]);
    const supplierDebtTotal = supplierDebtAgg[0]?.total || 0;

    const wallets = await Wallet.find({ storeId, isActive: true }).lean();
    const walletBalances = wallets.map(w => ({
      _id: w._id,
      name: w.name,
      type: w.type,
      balance: w.balance,
      minBalance: w.minBalance,
      isLow: w.balance <= w.minBalance
    }));

    const pendingInvoices = await Invoice.countDocuments({ storeId, status: 'issued', error: { $ne: '' } });

    const result = {
      period: 'this_month',
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      marginPercent,
      customerDebtTotal: Math.round(customerDebtTotal * 100) / 100,
      supplierDebtTotal: Math.round(supplierDebtTotal * 100) / 100,
      walletBalances,
      pendingInvoices
    };

    await cacheService.set(cacheKey, result, 300);

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = { employee, admin, financial };
