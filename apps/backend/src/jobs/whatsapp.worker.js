const { Worker } = require('bullmq');
const { getConnection } = require('./queue.service');
const Invoice = require('../modules/invoices/invoice.model');
const whatsappService = require('../services/whatsapp.service');

function startWhatsAppWorker() {
  const connection = getConnection();
  const worker = new Worker('whatsapp', async (job) => {
    const { invoiceId, phone, type } = job.data;
    console.log(`[WhatsAppWorker] Sending ${type} for invoice ${invoiceId} to ${phone}`);

    if (type === 'invoice' && invoiceId) {
      const invoice = await Invoice.findById(invoiceId).lean();
      if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

      const result = await whatsappService.sendInvoice(phone, invoice.pdfUrl, invoice.invoiceNumber);
      if (result?.error) throw new Error(result.error.message || 'WhatsApp API error');

      await Invoice.findByIdAndUpdate(invoiceId, {
        sentViaWhatsApp: true,
        whatsappMessageId: result?.messages?.[0]?.id || ''
      });
    }

    return { invoiceId, status: 'sent' };
  }, { connection, concurrency: 5 });

  worker.on('failed', async (job, err) => {
    console.error(`[WhatsAppWorker] Job ${job?.id} failed:`, err.message);
    if (job?.data?.invoiceId) {
      await Invoice.findByIdAndUpdate(job.data.invoiceId, {
        error: err.message,
        $inc: { whatsappRetryCount: 1 }
      });
    }
  });

  return worker;
}

module.exports = { startWhatsAppWorker };
