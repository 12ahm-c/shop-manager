const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['sale', 'stock_receipt', 'stock_adjust', 'payment', 'login', 'logout', 'import', 'settings_change'],
      required: true
    },
    entity: {
      type: String,
      enum: ['Sale', 'Product', 'Customer', 'Supplier', 'Wallet', 'User', 'Employee', 'Store'],
      required: true
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Indexes
logSchema.index({ storeId: 1, timestamp: -1 });

// Enforce append-only by throwing error on update or delete operations
const blockModification = function (next) {
  const err = new Error('Logs collection is append-only and cannot be modified or deleted.');
  next(err);
};

logSchema.pre('updateOne', blockModification);
logSchema.pre('updateMany', blockModification);
logSchema.pre('findOneAndUpdate', blockModification);
logSchema.pre('findOneAndReplace', blockModification);
logSchema.pre('deleteOne', blockModification);
logSchema.pre('deleteMany', blockModification);
logSchema.pre('findOneAndDelete', blockModification);
logSchema.pre('remove', blockModification);

// Hook into model level directly too
logSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Logs documents cannot be updated once created.'));
  }
  next();
});

module.exports = mongoose.model('Log', logSchema);
