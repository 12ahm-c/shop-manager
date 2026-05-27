import { api } from './client';

export const walletsApi = {
  getWallets: async () => {
    return await api.get('/wallets');
  },

  createWallet: async (data) => {
    return await api.post('/wallets', data);
  },

  transfer: async (data, idempotencyKey) => {
    return await api.post('/wallets/transfer', data, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
  },

  getTransactions: async (id, cursor = null, limit = 20) => {
    const query = cursor ? `?cursor=${cursor}&limit=${limit}` : `?limit=${limit}`;
    return await api.get(`/wallets/${id}/transactions${query}`);
  },

  reconcile: async (id, data) => {
    return await api.post(`/wallets/${id}/reconcile`, data);
  }
};
