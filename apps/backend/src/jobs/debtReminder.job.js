const Customer = require('../modules/customers/customer.model');
const Sale = require('../modules/sales/sale.model');
const Notification = require('../modules/notifications/notification.model');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ANTI_SPAM_WINDOW_MS = ONE_DAY_MS;

async function checkDebtReminders() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * ONE_DAY_MS);

  const debtors = await Customer.find({ currentDebt: { $gt: 0 } }).lean();

  for (const customer of debtors) {
    const lastSale = await Sale.findOne({ customerId: customer._id })
      .sort({ saleDate: -1 })
      .select('saleDate')
      .lean();

    const lastSaleDate = lastSale?.saleDate || customer.createdAt;
    if (lastSaleDate > thirtyDaysAgo) continue;

    const recentNotif = await Notification.findOne({
      storeId: customer.storeId,
      type: 'debt_overdue',
      'relatedEntity.customerId': customer._id,
      createdAt: { $gte: new Date(now.getTime() - ANTI_SPAM_WINDOW_MS) }
    }).lean();

    if (recentNotif) continue;

    const daysOverdue = Math.floor((now - new Date(lastSaleDate)) / (1000 * 60 * 60 * 24));
    let severity = 'warning';
    if (daysOverdue > 60) severity = 'overdue';
    else if (daysOverdue > 45) severity = 'critical';

    await Notification.create({
      storeId: customer.storeId,
      type: 'debt_overdue',
      message: `Customer "${customer.name}" has ${customer.currentDebt} MRU debt overdue for ${daysOverdue} days`,
      targetRole: 'admin',
      relatedEntity: { customerId: customer._id }
    });

    const io = require('../app').getIO();
    if (io) {
      io.to(`admin:${customer.storeId}`).emit('alert:debt_overdue', {
        customerId: customer._id,
        customerName: customer.name,
        currentDebt: customer.currentDebt,
        daysOverdue,
        severity
      });
    }
  }

  console.log(`[DebtReminder] Processed ${debtors.length} debtors`);
}

module.exports = { checkDebtReminders };
