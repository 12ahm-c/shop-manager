const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  pdfUrl: { type: String, default: '' },
  sentViaWhatsApp: { type: Boolean, default: false },
  sentViaEmail: { type: Boolean, default: false },
  sentAt: { type: Date, default: null },
  whatsappMessageId: { type: String, default: '' },
  emailMessageId: { type: String, default: '' },
  error: { type: String, default: '' },
  status: { type: String, enum: ['issued', 'cancelled'], default: 'issued' },
  cancelledAt: { type: Date, default: null },
  whatsappRetryCount: { type: Number, default: 0 }
}, { timestamps: true });

invoiceSchema.index({ storeId: 1, saleId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
