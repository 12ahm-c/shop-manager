import { api } from './client';

export const dashboardApi = {
  getFinancialDashboard: async () => {
    return await api.get('/dashboard/financial');
  }
};
