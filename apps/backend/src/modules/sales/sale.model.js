const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  profit: { type: Number, required: true }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  vatRate: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'credit', 'mixed'], required: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', default: null },
  paymentBreakdown: {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    credit: { type: Number, default: 0 }
  },
  isCredit: { type: Boolean, default: false },
  debtAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
  saleDate: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  items: [saleItemSchema]
}, { timestamps: true });

saleSchema.index({ storeId: 1, saleDate: -1 });
saleSchema.index({ storeId: 1, cashierId: 1, saleDate: -1 });
saleSchema.index({ status: 1 });

module.exports = mongoose.model('Sale', saleSchema);
