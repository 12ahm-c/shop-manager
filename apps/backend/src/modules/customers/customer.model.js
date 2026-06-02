const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  creditLimit: { type: Number, default: 0 },
  currentDebt: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  birthDate: { type: Date, default: null },
  allergies: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

customerSchema.index({ storeId: 1, phone: 1 }, { unique: true });
customerSchema.index({ storeId: 1, name: 1 });

module.exports = mongoose.model('Customer', customerSchema);
