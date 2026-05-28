import { api } from './client';

export const suppliersApi = {
  getSuppliers: async () => {
    return await api.get('/suppliers');
  },
  
  createSupplier: async (data) => {
    return await api.post('/suppliers', data);
  },
  
  getSupplierDebt: async (id) => {
    return await api.get(`/suppliers/${id}/debt`);
  },
  
  paySupplier: async (id, data, idempotencyKey) => {
    return await api.post(`/suppliers/${id}/pay`, data, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
  }
};
