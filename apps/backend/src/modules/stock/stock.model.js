const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0 },
    lotNumber: { type: String, default: '' },
    purchasePrice: { type: Number, required: true }, // Price of this specific batch
    expiryDate: { type: Date, default: null }, // Optional batch expiry date
    receptionDate: { type: Date, default: Date.now },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

// Indexes
// For FIFO sorting: oldest batches are selected first
stockSchema.index({ productId: 1, receptionDate: 1 });
// For store isolation and active batch checks
stockSchema.index({ storeId: 1, productId: 1, isActive: 1 });

module.exports = mongoose.model('Stock', stockSchema);
