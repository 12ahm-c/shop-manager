const { Worker } = require('bullmq');
const { getConnection } = require('./queue.service');
const Invoice = require('../modules/invoices/invoice.model');
const pdfService = require('../services/pdf.service');
const notificationService = require('../services/notification.service');

function startInvoiceWorker() {
  const connection = getConnection();
  const worker = new Worker('invoice-generation', async (job) => {
    const { saleId, invoiceId, storeId } = job.data;
    console.log(`[InvoiceWorker] Generating invoice for sale ${saleId} (invoice ${invoiceId})`);

    const pdfBuffer = await pdfService.generateInvoicePdf(invoiceId);
    const pdfUrl = pdfBuffer ? `/invoices/${invoiceId}.pdf` : '';

    await Invoice.findByIdAndUpdate(invoiceId, {
      pdfUrl,
      sentAt: new Date(),
      error: pdfBuffer ? '' : 'PDF generation skipped (dev mode)'
    });

    if (pdfBuffer) {
      const io = require('../app').getIO();
      if (io) {
        io.to(`admin:${storeId}`).emit('invoice:ready', { invoiceId, saleId });
      }
    }

    return { saleId, invoiceId, status: pdfBuffer ? 'pdf_generated' : 'pdf_skipped' };
  }, { connection, concurrency: 5 });

  worker.on('failed', async (job, err) => {
    console.error(`[InvoiceWorker] Job ${job?.id} failed:`, err.message);
    if (job?.data?.invoiceId) {
      await Invoice.findByIdAndUpdate(job.data.invoiceId, {
        error: err.message,
        $inc: { whatsappRetryCount: 1 }
      });

      const io = require('../app').getIO();
      await notificationService.createNotification({
        storeId: job.data.storeId,
        type: 'whatsapp_failed',
        message: `Invoice generation failed: ${err.message}`,
        targetRole: 'admin',
        io
      });
    }
  });

  worker.on('completed', (job) => {
    console.log(`[InvoiceWorker] Job ${job.id} completed successfully`);
  });

  return worker;
}

module.exports = { startInvoiceWorker };
