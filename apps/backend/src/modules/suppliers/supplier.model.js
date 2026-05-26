const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    currentDebt: { type: Number, default: 0 },
    notes: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

// Indexes
supplierSchema.index({ storeId: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
