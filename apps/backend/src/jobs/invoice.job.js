const { Worker } = require('bullmq');
const { getConnection } = require('./queue.service');
const Invoice = require('../modules/invoices/invoice.model');

function startInvoiceWorker() {
  const connection = getConnection();
  const worker = new Worker('invoice-generation', async (job) => {
    const { saleId, invoiceId, storeId } = job.data;
    console.log(`[InvoiceWorker] Generating invoice for sale ${saleId} (invoice ${invoiceId})`);

    await Invoice.findByIdAndUpdate(invoiceId, {
      pdfUrl: '',
      sentViaWhatsApp: false,
      sentViaEmail: false,
      sentAt: new Date()
    });

    return { saleId, invoiceId, status: 'processed' };
  }, { connection, concurrency: 5 });

  worker.on('failed', async (job, err) => {
    console.error(`[InvoiceWorker] Job ${job?.id} failed:`, err.message);
    if (job?.data?.invoiceId) {
      await Invoice.findByIdAndUpdate(job.data.invoiceId, {
        error: err.message,
        $inc: { whatsappRetryCount: 1 }
      });
    }
  });

  worker.on('completed', (job) => {
    console.log(`[InvoiceWorker] Job ${job.id} completed successfully`);
  });

  return worker;
}

module.exports = { startInvoiceWorker };
