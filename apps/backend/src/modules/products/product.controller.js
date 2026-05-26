const { z } = require('zod');
const mongoose = require('mongoose');
const Product = require('./product.model');
const Stock = require('../stock/stock.model');
const Log = require('../admin/log.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dci: z.string().optional().default(''),
  barcode: z.string().nullable().optional().default(null),
  category: z.string().min(1, 'Category is required'),
  sellPrice: z.number().positive('Sell price must be positive'),
  purchasePrice: z.number().nonnegative().optional().default(0),
  minStock: z.number().nonnegative().optional().default(0),
  unit: z.string().optional().default('pcs'),
  requiresPrescription: z.boolean().optional().default(false),
  imageUrl: z.string().optional().default('')
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  dci: z.string().optional(),
  barcode: z.string().nullable().optional(),
  category: z.string().min(1).optional(),
  sellPrice: z.number().positive().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  minStock: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  requiresPrescription: z.boolean().optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().optional()
});

const importProductsSchema = z.object({
  products: z.array(createProductSchema)
});

// POST /v1/products
const createProduct = async (req, res, next) => {
  try {
    const parsedData = createProductSchema.parse(req.body);
    const storeId = req.user.storeId;

    // Check if barcode is provided and already exists in this store
    if (parsedData.barcode) {
      const existingProduct = await Product.findOne({
        storeId,
        barcode: parsedData.barcode,
        isActive: true
      });
      if (existingProduct) {
        return sendError(
          res,
          'DUPLICATE_BARCODE',
          'Product barcode already exists in this store',
          { barcode: 'Barcode already in use' },
          409
        );
      }
    }

    const product = await Product.create({
      ...parsedData,
      storeId
    });

    return sendSuccess(res, product, null, 201);
  } catch (error) {
    next(error);
  }
};

// GET /v1/products/search
const searchProducts = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const storeId = req.user.storeId;

    const query = { storeId, isActive: true };

    if (q) {
      // Use text search or regex fallback
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { dci: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    // For employees, strip purchasePrice
    const resultProducts = products.map(product => {
      const p = product.toObject();
      if (req.user.role === 'employee') {
        delete p.purchasePrice;
      }
      return p;
    });

    return sendSuccess(res, resultProducts, {
      page,
      limit,
      total,
      hasMore: skip + products.length < total
    });
  } catch (error) {
    next(error);
  }
};

// GET /v1/products/:id
const getProductDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ _id: id, storeId, isActive: true });
    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Product not found', null, 404);
    }

    // Compute totalStock from the unified stock collection
    const stockAggregate = await Stock.aggregate([
      {
        $match: {
          productId: product._id,
          storeId,
          isActive: true,
          quantity: { $gt: 0 },
          // Expired batches (expiryDate < now) must be excluded
          $or: [
            { expiryDate: null },
            { expiryDate: { $gt: new Date() } }
          ]
        }
      },
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);

    const totalStock = stockAggregate[0] ? stockAggregate[0].totalStock : 0;

    const productObj = product.toObject();
    if (req.user.role === 'employee') {
      delete productObj.purchasePrice;
    }

    return sendSuccess(res, {
      product: productObj,
      totalStock
    });
  } catch (error) {
    next(error);
  }
};

// PUT /v1/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;
    const parsedData = updateProductSchema.parse(req.body);

    const product = await Product.findOne({ _id: id, storeId, isActive: true });
    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Product not found', null, 404);
    }

    // Check barcode uniqueness if it is changing
    if (parsedData.barcode && parsedData.barcode !== product.barcode) {
      const existingProduct = await Product.findOne({
        storeId,
        barcode: parsedData.barcode,
        isActive: true,
        _id: { $ne: id }
      });
      if (existingProduct) {
        return sendError(
          res,
          'DUPLICATE_BARCODE',
          'Product barcode already exists in this store',
          { barcode: 'Barcode already in use' },
          409
        );
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: parsedData },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, updatedProduct);
  } catch (error) {
    next(error);
  }
};

// DELETE /v1/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ _id: id, storeId, isActive: true });
    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Product not found', null, 404);
    }

    // Soft delete product
    product.isActive = false;
    await product.save();

    // Soft delete corresponding stock lots
    await Stock.updateMany({ productId: id, storeId }, { $set: { isActive: false } });

    return sendSuccess(res, { message: 'Product soft deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /v1/products/import
const importProducts = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parsedData = importProductsSchema.parse(req.body);
    const storeId = req.user.storeId;
    const importedProducts = [];

    for (const item of parsedData.products) {
      if (item.barcode) {
        // Check duplicate barcode
        const existing = await Product.findOne({
          storeId,
          barcode: item.barcode,
          isActive: true
        }).session(session);

        if (existing) {
          // Resolve duplicate by updating existing product
          Object.assign(existing, item);
          await existing.save({ session });
          importedProducts.push(existing);
          continue;
        }
      }

      const product = new Product({
        ...item,
        storeId
      });
      await product.save({ session });
      importedProducts.push(product);
    }

    // Append log
    await Log.create(
      [
        {
          storeId,
          userId: req.user.id,
          action: 'import',
          entity: 'Product',
          details: { count: importedProducts.length }
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sendSuccess(res, {
      message: `${importedProducts.length} products imported/updated successfully`,
      importedCount: importedProducts.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

module.exports = {
  createProduct,
  searchProducts,
  getProductDetail,
  updateProduct,
  deleteProduct,
  importProducts
};
