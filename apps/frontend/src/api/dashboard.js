import { api } from './client';

export const dashboardApi = {
  getEmployeeDashboard: async () => {
    return await api.get('/dashboard/employee');
  },

  getAdminDashboard: async (period = 'today') => {
    return await api.get(`/dashboard/admin?period=${period}`);
  },

  getFinancialDashboard: async () => {
    return await api.get('/dashboard/financial');
  }
};
