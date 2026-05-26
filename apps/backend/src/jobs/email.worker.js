const { Worker } = require('bullmq');
const { getConnection } = require('./queue.service');
const Invoice = require('../modules/invoices/invoice.model');
const emailService = require('../services/email.service');

function startEmailWorker() {
  const connection = getConnection();
  const worker = new Worker('email', async (job) => {
    const { invoiceId, email, type } = job.data;
    console.log(`[EmailWorker] Sending ${type} for invoice ${invoiceId} to ${email}`);

    if (type === 'invoice' && invoiceId) {
      const invoice = await Invoice.findById(invoiceId).lean();
      if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

      const result = await emailService.sendInvoice(email, invoice.pdfUrl, invoice.invoiceNumber);
      if (result?.rejected?.length) throw new Error('Email rejected');

      await Invoice.findByIdAndUpdate(invoiceId, {
        sentViaEmail: true,
        emailMessageId: result?.messageId || ''
      });
    }

    return { invoiceId, status: 'sent' };
  }, { connection, concurrency: 5 });

  worker.on('failed', async (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
    if (job?.data?.invoiceId) {
      await Invoice.findByIdAndUpdate(job.data.invoiceId, {
        error: err.message,
        $inc: { whatsappRetryCount: 1 }
      });
    }
  });

  return worker;
}

module.exports = { startEmailWorker };
