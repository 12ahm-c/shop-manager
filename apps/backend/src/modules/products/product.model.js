const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true },
    dci: { type: String, default: '' },
    barcode: { type: String, default: null },
    category: { type: String, required: true },
    sellPrice: { type: Number, required: true },
    purchasePrice: { type: Number, required: true, default: 0 }, // Weighted Average Price
    minStock: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' },
    requiresPrescription: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    imageUrl: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

// Indexes
// Compound unique index per store for barcode (sparse so nulls are ignored)
productSchema.index({ storeId: 1, barcode: 1 }, { unique: true, sparse: true });
productSchema.index({ storeId: 1, name: 1 });
productSchema.index({ name: 'text', dci: 'text', barcode: 'text' });

module.exports = mongoose.model('Product', productSchema);
