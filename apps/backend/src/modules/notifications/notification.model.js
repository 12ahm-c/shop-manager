const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  type: {
    type: String,
    enum: ['stock_critical', 'out_of_stock', 'debt_overdue', 'low_wallet', 'whatsapp_failed'],
    required: true
  },
  message: { type: String, required: true },
  targetRole: { type: String, enum: ['admin', 'employee', 'accountant'], default: 'admin' },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isRead: { type: Boolean, default: false },
  relatedEntity: {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', default: null }
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false, versionKey: false });

notificationSchema.index({ storeId: 1, targetRole: 1, isRead: 1 });
notificationSchema.index({ targetUserId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
