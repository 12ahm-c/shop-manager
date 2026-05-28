import { api } from './client';

export const customersApi = {
  searchCustomers: async (query) => {
    return await api.get(`/customers/search?q=${encodeURIComponent(query)}`);
  },

  createCustomer: async (customerData) => {
    return await api.post('/customers', customerData);
  },

  redeemLoyalty: async (customerId, pointsToRedeem) => {
    return await api.post(`/customers/${customerId}/loyalty/redeem`, { points: pointsToRedeem });
  },

  getCustomer: async (id) => {
    return await api.get(`/customers/${id}`);
  },

  payDebt: async (id, data, idempotencyKey) => {
    return await api.post(`/customers/${id}/debt/pay`, data, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
  },

  getOverdueDebts: async () => {
    return await api.get('/customers/debt/overdue');
  }
};
