const mongoose = require('mongoose');
const Sale = require('./sale.model');
const Stock = require('../stock/stock.model');
const Product = require('../products/product.model');
const Customer = require('../customers/customer.model');
const Wallet = require('../wallets/wallet.model');
const WalletTransaction = require('../wallets/walletTransaction.model');
const Invoice = require('../invoices/invoice.model');
const Store = require('../stores/store.model');
const Log = require('../admin/log.model');
const cacheService = require('../../services/cache.service');
const { generateInvoiceNumber } = require('../../utils/invoiceNumber');
const { addInvoiceJob } = require('../../jobs/queue.service');

async function createSale(data, user) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const storeId = user.storeId;
    const cashierId = user.id;
    const { items, customerId, paymentMethod, walletId, cashGiven, useLoyaltyPoints } = data;

    // Step 1: Validate inputs
    const resolvedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId, isActive: true }).session(session);
      if (!product) {
        throw Object.assign(new Error(`Product not found: ${item.productId}`), { status: 404, code: 'NOT_FOUND' });
      }
      resolvedItems.push({ product, quantity: item.quantity });
    }

    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, storeId }).session(session);
      if (!customer) {
        throw Object.assign(new Error('Customer not found'), { status: 404, code: 'NOT_FOUND' });
      }
    }

    let wallet = null;
    if (walletId) {
      wallet = await Wallet.findOne({ _id: walletId, storeId, isActive: true }).session(session);
      if (!wallet) {
        throw Object.assign(new Error('Wallet not found'), { status: 404, code: 'NOT_FOUND' });
      }
    }

    const store = await Store.findById(storeId).session(session);
    if (!store) {
      throw Object.assign(new Error('Store not found'), { status: 404, code: 'NOT_FOUND' });
    }

    if (useLoyaltyPoints && useLoyaltyPoints > 0) {
      if (!customer) {
        throw Object.assign(new Error('Customer required for loyalty redemption'), { status: 400, code: 'VALIDATION_ERROR' });
      }
      if (customer.loyaltyPoints < useLoyaltyPoints) {
        throw Object.assign(new Error('Insufficient loyalty points'), { status: 422, code: 'INSUFFICIENT_POINTS' });
      }
    }

    // Step 2: FIFO stock selection & decrement
    const saleItems = [];
    const stockDeductions = [];
    let totalAmount = 0;
    let totalCost = 0;

    for (const item of resolvedItems) {
      const activeLots = await Stock.find({
        productId: item.product._id,
        storeId,
        isActive: true,
        quantity: { $gt: 0 },
        $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }]
      }).sort({ receptionDate: 1 }).session(session);

      const totalAvailable = activeLots.reduce((sum, lot) => sum + lot.quantity, 0);
      if (totalAvailable < item.quantity) {
        throw Object.assign(
          new Error(`Insufficient stock for product ${item.product.name}. Requested: ${item.quantity}, Available: ${totalAvailable}`),
          { status: 422, code: 'INSUFFICIENT_STOCK' }
        );
      }

      let remaining = item.quantity;
      for (const lot of activeLots) {
        if (remaining <= 0) break;
        const needed = Math.min(lot.quantity, remaining);
        const updated = await Stock.findOneAndUpdate(
          { _id: lot._id, quantity: { $gte: needed } },
          { $inc: { quantity: -needed } },
          { session, new: true }
        );
        if (!updated) continue;

        const subtotal = needed * item.product.sellPrice;
        const cost = needed * lot.purchasePrice;
        const profit = subtotal - cost;

        saleItems.push({
          productId: item.product._id,
          stockId: lot._id,
          quantity: needed,
          unitPrice: item.product.sellPrice,
          purchasePrice: lot.purchasePrice,
          subtotal,
          profit
        });

        stockDeductions.push({ lotId: lot._id, quantity: needed });
        totalAmount += subtotal;
        totalCost += cost;
        remaining -= needed;
      }
    }

    // Step 3: Calculate financials
    const { vatRate } = store.settings;
    const preVatTotal = totalAmount;
    const vatAmount = vatRate > 0 ? Math.round((preVatTotal * vatRate / (1 + vatRate)) * 100) / 100 : 0;
    totalAmount = Math.round(totalAmount * 100) / 100;

    let changeAmount = 0;
    let walletAmount = 0;
    let debtAmount = 0;
    let isCredit = false;
    const paymentBreakdown = { cash: 0, card: 0, credit: 0 };

    if (paymentMethod === 'cash') {
      walletAmount = totalAmount;
      paymentBreakdown.cash = totalAmount;
      if (cashGiven && cashGiven > totalAmount) {
        changeAmount = cashGiven - totalAmount;
      }
    } else if (paymentMethod === 'card') {
      walletAmount = totalAmount;
      paymentBreakdown.card = totalAmount;
    } else if (paymentMethod === 'credit') {
      isCredit = true;
      debtAmount = totalAmount;
      paymentBreakdown.credit = totalAmount;
    } else if (paymentMethod === 'mixed') {
      if (cashGiven && cashGiven > 0) {
        paymentBreakdown.cash = Math.min(cashGiven, totalAmount);
        walletAmount += paymentBreakdown.cash;
      }
      if (paymentBreakdown.cash < totalAmount) {
        paymentBreakdown.credit = totalAmount - paymentBreakdown.cash;
        debtAmount = paymentBreakdown.credit;
        isCredit = true;
      }
    }

    // Validate credit limit
    if (isCredit && customer) {
      const newDebt = (customer.currentDebt || 0) + debtAmount;
      if (newDebt > customer.creditLimit) {
        throw Object.assign(
          new Error(`Credit limit exceeded. Limit: ${customer.creditLimit}, would become: ${newDebt}`),
          { status: 422, code: 'CREDIT_LIMIT_EXCEEDED' }
        );
      }
    }

    // Step 4: Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(storeId, session);

    // Step 5: Create documents in transaction
    const [sale] = await Sale.create([{
      storeId,
      cashierId,
      customerId: customer?._id || null,
      totalAmount,
      discount: 0,
      vatAmount,
      vatRate,
      paymentMethod,
      walletId: wallet?._id || null,
      paymentBreakdown,
      isCredit,
      debtAmount,
      status: 'completed',
      items: saleItems
    }], { session });

    // Update wallet
    if (wallet && walletAmount > 0) {
      const updatedWallet = await Wallet.findByIdAndUpdate(
        wallet._id,
        { $inc: { balance: walletAmount } },
        { new: true, session }
      );
      await WalletTransaction.create([{
        storeId,
        walletId: wallet._id,
        type: 'credit',
        amount: walletAmount,
        balanceAfter: updatedWallet.balance,
        reference: sale._id.toString(),
        description: `Sale ${invoiceNumber}`,
        userId: cashierId
      }], { session });
    }

    // Update customer debt
    if (customer && debtAmount > 0) {
      await Customer.findByIdAndUpdate(
        customer._id,
        { $inc: { currentDebt: debtAmount } },
        { session }
      );
    }

    // Update loyalty points
    let loyaltyPointsEarned = 0;
    if (customer) {
      const { loyaltyPointsPer100 } = store.settings;
      loyaltyPointsEarned = Math.floor(totalAmount / 100) * (loyaltyPointsPer100 || 1);
      const pointsRedeemed = useLoyaltyPoints || 0;
      const netPoints = loyaltyPointsEarned - pointsRedeemed;
      if (netPoints !== 0) {
        await Customer.findByIdAndUpdate(
          customer._id,
          { $inc: { loyaltyPoints: netPoints } },
          { session }
        );
      }
    }

    // Create invoice document
    const [invoice] = await Invoice.create([{
      storeId,
      saleId: sale._id,
      invoiceNumber,
      status: 'issued'
    }], { session });

    // Append audit log
    await Log.create([{
      storeId,
      userId: cashierId,
      action: 'sale',
      entity: 'Sale',
      entityId: sale._id,
      details: { totalAmount, itemCount: items.length, invoiceNumber }
    }], { session });

    await session.commitTransaction();
    session.endSession();

    cacheService.invalidateDashboard(storeId).catch(() => {});

    // Step 6: Post-transaction async work
    const io = require('../../app').getIO();
    if (io) {
      io.to(`admin:${storeId}`).emit('sale:new', {
        saleId: sale._id,
        invoiceNumber,
        totalAmount,
        cashierId
      });
      io.to(`admin:${storeId}`).emit('dashboard:update', { storeId });
    }

    // Check stock alerts
    for (const item of resolvedItems) {
      const remainingStock = await Stock.aggregate([
        { $match: { productId: item.product._id, storeId, isActive: true } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]).session(session);
      const totalQty = remainingStock[0]?.total || 0;
      if (totalQty === 0) {
        if (io) io.to(`admin:${storeId}`).emit('alert:out_of_stock', { productId: item.product._id });
      } else if (totalQty <= item.product.minStock) {
        if (io) io.to(`admin:${storeId}`).emit('alert:stock_critical', { productId: item.product._id, quantity: totalQty });
      }
    }

    // Queue invoice job asynchronously (fire and forget)
    try {
      await addInvoiceJob({ saleId: sale._id, invoiceId: invoice._id, storeId });
    } catch (queueErr) {
      console.error('Failed to queue invoice job:', queueErr.message);
    }

    return {
      saleId: sale._id,
      invoiceNumber,
      totalAmount,
      changeAmount,
      loyaltyPointsEarned,
      newDebt: debtAmount
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

async function cancelSale(saleId, user) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const storeId = user.storeId;
    const sale = await Sale.findOne({ _id: saleId, storeId }).session(session);
    if (!sale) {
      throw Object.assign(new Error('Sale not found'), { status: 404, code: 'NOT_FOUND' });
    }
    if (sale.status !== 'completed') {
      throw Object.assign(new Error('Sale is not in completed state'), { status: 409, code: 'INVALID_STATE' });
    }

    // Reverse stock
    for (const item of sale.items) {
      await Stock.findOneAndUpdate(
        { _id: item.stockId },
        { $inc: { quantity: item.quantity } },
        { session }
      );
    }

    // Reverse wallet credit
    const walletAmount = sale.paymentBreakdown.cash + sale.paymentBreakdown.card;
    if (walletAmount > 0 && sale.walletId) {
      const updatedWallet = await Wallet.findByIdAndUpdate(
        sale.walletId,
        { $inc: { balance: -walletAmount } },
        { new: true, session }
      );
      await WalletTransaction.create([{
        storeId,
        walletId: sale.walletId,
        type: 'debit',
        amount: walletAmount,
        balanceAfter: updatedWallet.balance,
        reference: sale._id.toString(),
        description: `Cancellation of sale ${sale.invoiceNumber}`,
        userId: user.id
      }], { session });
    }

    // Reverse customer debt
    if (sale.debtAmount > 0 && sale.customerId) {
      await Customer.findByIdAndUpdate(
        sale.customerId,
        { $inc: { currentDebt: -sale.debtAmount } },
        { session }
      );
    }

    // Reverse loyalty points
    if (sale.customerId) {
      const store = await Store.findById(storeId).session(session);
      const { loyaltyPointsPer100 } = store?.settings || { loyaltyPointsPer100: 1 };
      const earnedPoints = Math.floor(sale.totalAmount / 100) * (loyaltyPointsPer100 || 1);
      await Customer.findByIdAndUpdate(
        sale.customerId,
        { $inc: { loyaltyPoints: -earnedPoints } },
        { session }
      );
    }

    // Mark invoice cancelled
    await Invoice.findOneAndUpdate(
      { saleId: sale._id },
      { status: 'cancelled', cancelledAt: new Date() },
      { session }
    );

    // Mark sale cancelled
    sale.status = 'cancelled';
    await sale.save({ session });

    // Append audit log
    await Log.create([{
      storeId,
      userId: user.id,
      action: 'payment',
      entity: 'Sale',
      entityId: sale._id,
      details: { cancellation: true, invoiceNumber: sale.invoiceNumber }
    }], { session });

    await session.commitTransaction();
    session.endSession();

    cacheService.invalidateDashboard(storeId).catch(() => {});

    const io = require('../../app').getIO();
    if (io) {
      io.to(`admin:${storeId}`).emit('dashboard:update', { storeId });
    }

    return { saleId: sale._id, status: 'cancelled' };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

module.exports = { createSale, cancelSale };
