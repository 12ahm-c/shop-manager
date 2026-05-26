const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    logo: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    taxId: { type: String, default: '' },
    currency: { type: String, default: 'MRU' },
    settings: {
      loyaltyPointsPer100: { type: Number, default: 1 },
      loyaltyRedeemRate: { type: Number, default: 1 },
      invoiceNextNumber: { type: Number, default: 1 },
      vatRate: { type: Number, default: 0 },
      lowStockThresholdPercent: { type: Number, default: 10 }
    },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
);

module.exports = mongoose.model('Store', storeSchema);
