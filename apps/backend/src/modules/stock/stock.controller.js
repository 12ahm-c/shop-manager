const { z } = require('zod');
const mongoose = require('mongoose');
const Stock = require('./stock.model');
const Product = require('../products/product.model');
const Supplier = require('../suppliers/supplier.model');
const Store = require('../stores/store.model');
const Log = require('../admin/log.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

// Validation schemas
const receiveStockSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().positive('Quantity must be positive'),
        purchasePrice: z.number().positive('Purchase price must be positive'),
        lotNumber: z.string().optional().default(''),
        expiryDate: z
          .string()
          .datetime({ message: 'Invalid expiry date format' })
          .or(z.string().date())
          .optional()
          .nullable()
      })
    )
    .min(1, 'At least one item is required')
});

const adjustStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  lotId: z.string().optional(),
  quantity: z.number().nonnegative('Quantity adjustment must be non-negative'),
  type: z.enum(['increment', 'decrement', 'set']),
  reason: z.string().min(1, 'Reason is required')
});

const transferStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  toStoreId: z.string().min(1, 'Target store ID is required'),
  quantity: z.number().positive('Transfer quantity must be positive')
});

// Helper: Universal Weighted Average Price (WAP) recalculation
const recalculateProductWAP = async (productId, storeId, session) => {
  const lots = await Stock.find({
    productId,
    storeId,
    isActive: true,
    quantity: { $gt: 0 },
    $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }]
  }).session(session);

  let totalValue = 0;
  let totalQty = 0;

  for (const lot of lots) {
    totalValue += lot.quantity * lot.purchasePrice;
    totalQty += lot.quantity;
  }

  const newWAP = totalQty > 0 ? Math.round((totalValue / totalQty) * 100) / 100 : 0;

  await Product.findByIdAndUpdate(
    productId,
    { $set: { purchasePrice: newWAP } },
    { session }
  );
};

// POST /v1/stock/receive
const receiveStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parsedData = receiveStockSchema.parse(req.body);
    const storeId = req.user.storeId;

    // Verify supplier exists and belongs to the store
    const supplier = await Supplier.findOne({
      _id: parsedData.supplierId,
      storeId
    }).session(session);
    if (!supplier) {
      return sendError(res, 'NOT_FOUND', 'Supplier not found', null, 404);
    }

    const createdLots = [];
    let totalCost = 0;

    for (const item of parsedData.items) {
      // Verify product exists and belongs to the store
      const product = await Product.findOne({
        _id: item.productId,
        storeId,
        isActive: true
      }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // Create stock lot document
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
      const [lot] = await Stock.create(
        [
          {
            storeId,
            productId: item.productId,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            lotNumber: item.lotNumber,
            expiryDate,
            supplierId: supplier._id,
            isActive: true
          }
        ],
        { session }
      );

      // Accumulate cost
      totalCost += item.quantity * item.purchasePrice;

      // Recalculate WAP for this product
      await recalculateProductWAP(item.productId, storeId, session);

      createdLots.push(lot);
    }

    // Increment supplier debt
    supplier.currentDebt = (supplier.currentDebt || 0) + totalCost;
    await supplier.save({ session });

    // Create Audit Log
    await Log.create(
      [
        {
          storeId,
          userId: req.user.id,
          action: 'stock_receipt',
          entity: 'Supplier',
          entityId: supplier._id,
          details: { itemsCount: parsedData.items.length, totalCost }
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sendSuccess(res, createdLots, null, 201);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error.message && error.message.startsWith('Product not found:')) {
      return sendError(res, 'NOT_FOUND', error.message, null, 404);
    }
    next(error);
  }
};

// POST /v1/stock/adjust
const adjustStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parsedData = adjustStockSchema.parse(req.body);
    const storeId = req.user.storeId;

    // Verify product exists and belongs to the store
    const product = await Product.findOne({
      _id: parsedData.productId,
      storeId,
      isActive: true
    }).session(session);
    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Product not found', null, 404);
    }

    let lot;
    if (parsedData.lotId) {
      lot = await Stock.findOne({
        _id: parsedData.lotId,
        productId: parsedData.productId,
        storeId,
        isActive: true
      }).session(session);
    } else {
      // Find the newest lot
      lot = await Stock.findOne({
        productId: parsedData.productId,
        storeId,
        isActive: true
      })
        .sort({ receptionDate: -1 })
        .session(session);
    }

    if (!lot) {
      return sendError(res, 'NOT_FOUND', 'Active stock lot not found to adjust', null, 404);
    }

    // Apply adjustment
    const originalQty = lot.quantity;
    if (parsedData.type === 'increment') {
      lot.quantity += parsedData.quantity;
    } else if (parsedData.type === 'decrement') {
      if (lot.quantity < parsedData.quantity) {
        return sendError(
          res,
          'INSUFFICIENT_STOCK',
          'Cannot adjust stock lot below zero',
          null,
          422
        );
      }
      lot.quantity -= parsedData.quantity;
    } else if (parsedData.type === 'set') {
      lot.quantity = parsedData.quantity;
    }

    await lot.save({ session });

    // Recalculate WAP for this product
    await recalculateProductWAP(parsedData.productId, storeId, session);

    // Create Audit Log
    await Log.create(
      [
        {
          storeId,
          userId: req.user.id,
          action: 'stock_adjust',
          entity: 'Product',
          entityId: product._id,
          details: {
            lotId: lot._id,
            type: parsedData.type,
            adjustmentAmount: parsedData.quantity,
            originalQuantity: originalQty,
            newQuantity: lot.quantity,
            reason: parsedData.reason
          }
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sendSuccess(res, lot);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// GET /v1/stock/:productId
const listStockLots = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.storeId;

    const lots = await Stock.find({
      productId,
      storeId,
      isActive: true,
      quantity: { $gt: 0 }
    }).sort({ receptionDate: 1 });

    const resultLots = lots.map(lot => {
      const l = lot.toObject();
      if (req.user.role === 'employee') {
        delete l.purchasePrice;
      }
      return l;
    });

    return sendSuccess(res, resultLots);
  } catch (error) {
    next(error);
  }
};

// POST /v1/stock/transfer
const transferStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parsedData = transferStockSchema.parse(req.body);
    const storeId = req.user.storeId; // Source store

    // Verify source product exists
    const srcProduct = await Product.findOne({
      _id: parsedData.productId,
      storeId,
      isActive: true
    }).session(session);
    if (!srcProduct) {
      return sendError(res, 'NOT_FOUND', 'Source product not found', null, 404);
    }

    // Verify target store exists
    const targetStore = await Store.findOne({
      _id: parsedData.toStoreId,
      isActive: true
    }).session(session);
    if (!targetStore) {
      return sendError(res, 'NOT_FOUND', 'Target store not found or inactive', null, 404);
    }

    // Find or create corresponding target product in target store by barcode or name
    let destProduct = await Product.findOne({
      storeId: parsedData.toStoreId,
      barcode: srcProduct.barcode,
      isActive: true
    }).session(session);

    if (!destProduct) {
      destProduct = await Product.findOne({
        storeId: parsedData.toStoreId,
        name: srcProduct.name,
        isActive: true
      }).session(session);
    }

    if (!destProduct) {
      // Create a copy of the product document in the target store
      destProduct = new Product({
        storeId: parsedData.toStoreId,
        name: srcProduct.name,
        dci: srcProduct.dci,
        barcode: srcProduct.barcode,
        category: srcProduct.category,
        sellPrice: srcProduct.sellPrice,
        purchasePrice: 0, // Recalculated once lots are added
        minStock: srcProduct.minStock,
        unit: srcProduct.unit,
        requiresPrescription: srcProduct.requiresPrescription,
        imageUrl: srcProduct.imageUrl,
        isActive: true
      });
      await destProduct.save({ session });
    }

    // Find all active stock lots in source store sorted by FIFO
    const activeLots = await Stock.find({
      productId: parsedData.productId,
      storeId,
      isActive: true,
      quantity: { $gt: 0 },
      $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }]
    })
      .sort({ receptionDate: 1 })
      .session(session);

    // Sum total available qty
    const totalAvailable = activeLots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (totalAvailable < parsedData.quantity) {
      return sendError(
        res,
        'INSUFFICIENT_STOCK',
        `Insufficient stock for transfer. Requested: ${parsedData.quantity}, Available: ${totalAvailable}`,
        null,
        422
      );
    }

    let remainingToTransfer = parsedData.quantity;

    for (const srcLot of activeLots) {
      if (remainingToTransfer <= 0) break;

      const qtyToTake = Math.min(srcLot.quantity, remainingToTransfer);

      // Decrement quantity from source lot
      srcLot.quantity -= qtyToTake;
      await srcLot.save({ session });

      // Create new stock lot in target store
      await Stock.create(
        [
          {
            storeId: parsedData.toStoreId,
            productId: destProduct._id,
            quantity: qtyToTake,
            purchasePrice: srcLot.purchasePrice,
            lotNumber: srcLot.lotNumber,
            expiryDate: srcLot.expiryDate,
            supplierId: srcLot.supplierId,
            isActive: true,
            receptionDate: srcLot.receptionDate // Preserve reception date for FIFO consistency
          }
        ],
        { session }
      );

      remainingToTransfer -= qtyToTake;
    }

    // Recalculate WAP for both source and target products
    await recalculateProductWAP(parsedData.productId, storeId, session);
    await recalculateProductWAP(destProduct._id, parsedData.toStoreId, session);

    // Audit logs for both stores
    await Log.create(
      [
        {
          storeId,
          userId: req.user.id,
          action: 'stock_adjust',
          entity: 'Product',
          entityId: srcProduct._id,
          details: {
            transferToStoreId: parsedData.toStoreId,
            transferredQuantity: parsedData.quantity
          }
        },
        {
          storeId: parsedData.toStoreId,
          userId: req.user.id,
          action: 'stock_receipt',
          entity: 'Product',
          entityId: destProduct._id,
          details: {
            transferFromStoreId: storeId,
            transferredQuantity: parsedData.quantity
          }
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sendSuccess(res, { message: 'Stock transferred successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

module.exports = {
  receiveStock,
  adjustStock,
  listStockLots,
  transferStock
};
