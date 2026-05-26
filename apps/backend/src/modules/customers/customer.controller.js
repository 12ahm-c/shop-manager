const { z } = require('zod');
const Customer = require('./customer.model');
const Sale = require('../sales/sale.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  birthDate: z.string().optional().nullable(),
  allergies: z.string().optional(),
  notes: z.string().optional()
});

const create = async (req, res, next) => {
  try {
    const parsedData = createCustomerSchema.parse(req.body);
    const storeId = req.user.storeId;

    const existing = await Customer.findOne({ storeId, phone: parsedData.phone });
    if (existing) {
      return sendError(res, 'DUPLICATE_ENTRY', 'A customer with this phone already exists in this store', null, 409);
    }

    const customer = await Customer.create({
      ...parsedData,
      storeId,
      birthDate: parsedData.birthDate ? new Date(parsedData.birthDate) : null
    });

    return sendSuccess(res, customer, null, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', error.errors, 400);
    }
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const q = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { storeId };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter)
    ]);

    return sendSuccess(res, customers, {
      page, limit, total,
      hasMore: skip + customers.length < total
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const customer = await Customer.findOne({ _id: req.params.id, storeId }).lean();
    if (!customer) {
      return sendError(res, 'NOT_FOUND', 'Customer not found', null, 404);
    }

    const recentSales = await Sale.find({ customerId: customer._id, storeId })
      .sort({ saleDate: -1 })
      .limit(10)
      .lean();

    return sendSuccess(res, { customer, recentSales });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, search, getById };
