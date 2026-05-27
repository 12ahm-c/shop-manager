const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['cash', 'bank', 'ccp', 'mobile_money', 'customer_deposit'], required: true },
  currency: { type: String, default: 'MRU' },
  balance: { type: Number, default: 0 },
  minBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastReconciliation: { type: Date, default: null }
}, { timestamps: true });

walletSchema.index({ storeId: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
