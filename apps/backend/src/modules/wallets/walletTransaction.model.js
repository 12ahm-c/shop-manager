const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  type: { type: String, enum: ['credit', 'debit', 'transfer'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  reference: { type: String, default: '' },
  description: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false, versionKey: false });

walletTransactionSchema.index({ walletId: 1, timestamp: -1 });
walletTransactionSchema.index({ storeId: 1, timestamp: -1 });

const blockModification = function (next) {
  next(new Error('WalletTransaction collection is append-only and cannot be modified or deleted.'));
};

walletTransactionSchema.pre('updateOne', blockModification);
walletTransactionSchema.pre('updateMany', blockModification);
walletTransactionSchema.pre('findOneAndUpdate', blockModification);
walletTransactionSchema.pre('findOneAndReplace', blockModification);
walletTransactionSchema.pre('deleteOne', blockModification);
walletTransactionSchema.pre('deleteMany', blockModification);
walletTransactionSchema.pre('findOneAndDelete', blockModification);
walletTransactionSchema.pre('remove', blockModification);
walletTransactionSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('WalletTransaction documents cannot be updated once created.'));
  }
  next();
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
