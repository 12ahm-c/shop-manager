const Invoice = require('./invoice.model');
const Sale = require('../sales/sale.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const { addInvoiceJob } = require('../../jobs/queue.service');

const getById = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const invoice = await Invoice.findOne({ _id: req.params.id, storeId })
      .populate({
        path: 'saleId',
        select: 'totalAmount saleDate cashierId paymentMethod',
        populate: { path: 'cashierId', select: 'name' }
      })
      .lean();

    if (!invoice) {
      return sendError(res, 'NOT_FOUND', 'Invoice not found', null, 404);
    }

    return sendSuccess(res, { invoice });
  } catch (error) {
    next(error);
  }
};

const getBySaleId = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const invoice = await Invoice.findOne({ saleId: req.params.saleId, storeId })
      .populate({
        path: 'saleId',
        select: 'totalAmount saleDate cashierId paymentMethod',
        populate: { path: 'cashierId', select: 'name' }
      })
      .lean();

    if (!invoice) {
      return sendError(res, 'NOT_FOUND', 'Invoice not found for this sale', null, 404);
    }

    return sendSuccess(res, { invoice });
  } catch (error) {
    next(error);
  }
};

const resend = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const invoice = await Invoice.findOne({ _id: req.params.id, storeId });
    if (!invoice) {
      return sendError(res, 'NOT_FOUND', 'Invoice not found', null, 404);
    }

    invoice.error = '';
    invoice.whatsappRetryCount = (invoice.whatsappRetryCount || 0) + 1;
    await invoice.save();

    await addInvoiceJob({ saleId: invoice.saleId, invoiceId: invoice._id, storeId });

    return sendSuccess(res, {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      retryCount: invoice.whatsappRetryCount,
      message: 'Invoice regeneration queued'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getById, getBySaleId, resend };
