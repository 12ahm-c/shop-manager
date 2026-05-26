// PDF generation service
// Production: requires `puppeteer` npm package
// Dev fallback: returns a placeholder

const Invoice = require('../modules/invoices/invoice.model');
const Sale = require('../modules/sales/sale.model');
const Store = require('../modules/stores/store.model');

let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  // puppeteer not installed — dev fallback
}

async function generateInvoicePdf(invoiceId) {
  if (!puppeteer) {
    console.log(`[PDF] Dev mode: skipping PDF generation for invoice ${invoiceId}`);
    return null;
  }

  const invoice = await Invoice.findById(invoiceId).populate('saleId').lean();
  if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

  const store = await Store.findById(invoice.storeId).lean();
  const html = buildInvoiceHtml(invoice, store);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

function buildInvoiceHtml(invoice, store) {
  const sale = invoice.saleId || {};
  const items = (sale.items || []).map(item => `
    <tr>
      <td>${item.productId}</td>
      <td>${item.quantity}</td>
      <td>${(item.unitPrice / 100).toFixed(2)}</td>
      <td>${(item.subtotal / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12px; }
      .header { text-align: center; margin-bottom: 30px; }
      .header h1 { margin: 0; font-size: 18px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f5f5f5; }
      .total { text-align: right; font-weight: bold; margin-top: 20px; }
    </style>
  </head><body>
    <div class="header">
      <h1>${store?.name || 'Store'}</h1>
      <p>Invoice: ${invoice.invoiceNumber}</p>
      <p>Date: ${new Date(sale.saleDate || Date.now()).toLocaleDateString()}</p>
    </div>
    <table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${items}</tbody></table>
    <div class="total">Total: ${(sale.totalAmount / 100).toFixed(2)} ${store?.currency || 'MRU'}</div>
  </body></html>`;
}

module.exports = { generateInvoicePdf };
