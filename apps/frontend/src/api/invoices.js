import { api } from './client';

export const invoicesApi = {
  getInvoice: async (id) => {
    return await api.get(`/invoices/${id}`);
  },

  getInvoiceBySale: async (saleId) => {
    return await api.get(`/invoices/sale/${saleId}`);
  },

  resendInvoice: async (id) => {
    return await api.post(`/invoices/${id}/resend`);
  }
};
