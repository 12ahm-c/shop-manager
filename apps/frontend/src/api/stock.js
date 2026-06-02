/* eslint-disable no-unused-vars */
// Using mock responses based on docs/API-contract.md
import { api } from './client';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const stockApi = {
  getStockForProduct: async (productId) => {
    // return api.get(`/stock/${productId}`);
    await delay(300);
    return {
      success: true,
      data: {
        productId,
        totalStock: 45,
        lots: [
          {
            _id: "65f000000000000000000201",
            storeId: "store-123",
            supplierId: "supp-123",
            quantity: 25,
            purchasePrice: 1000,
            expiryDate: "2026-12-31T00:00:00.000Z",
            status: "active",
            createdAt: new Date().toISOString()
          },
          {
            _id: "65f000000000000000000202",
            storeId: "store-123",
            supplierId: "supp-456",
            quantity: 20,
            purchasePrice: 1100,
            expiryDate: null,
            status: "active",
            createdAt: new Date().toISOString()
          }
        ]
      },
      error: null,
      meta: null
    };
  },

  receiveStock: async (_data, _idempotencyKey) => {
    // return api.post('/stock/receive', data, { headers: { 'Idempotency-Key': idempotencyKey } });
    await delay(500);
    return {
      success: true,
      data: {
        lot: {
          _id: "65f000000000000000000203",
          ..._data,
          status: "active",
          createdAt: new Date().toISOString()
        }
      },
      error: null,
      meta: null
    };
  },

  adjustStock: async (_data, _idempotencyKey) => {
    // return api.post('/stock/adjust', data, { headers: { 'Idempotency-Key': idempotencyKey } });
    await delay(400);
    return {
      success: true,
      data: null,
      error: null,
      meta: null
    };
  },

  transferStock: async (_data, _idempotencyKey) => {
    // return api.post('/stock/transfer', data, { headers: { 'Idempotency-Key': idempotencyKey } });
    await delay(500);
    return {
      success: true,
      data: null,
      error: null,
      meta: null
    };
  }
};
