import { api } from './client';

export const notificationsApi = {
  getMyNotifications: async () => {
    return await api.get('/notifications/me');
  },

  markRead: async (id) => {
    return await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async () => {
    return await api.patch('/notifications/read-all');
  },

  getAlerts: async () => {
    return await api.get('/admin/alerts');
  }
};
