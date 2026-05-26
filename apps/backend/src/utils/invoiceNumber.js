const Store = require('../modules/stores/store.model');

async function generateInvoiceNumber(storeId, session) {
  const store = await Store.findByIdAndUpdate(
    storeId,
    { $inc: { 'settings.invoiceNextNumber': 1 } },
    { new: true, session }
  );
  if (!store) {
    throw new Error('Store not found');
  }
  const num = store.settings.invoiceNextNumber - 1;
  const year = new Date().getFullYear();
  const padded = String(num).padStart(5, '0');
  return `FAC-${year}-${padded}`;
}

module.exports = { generateInvoiceNumber };
