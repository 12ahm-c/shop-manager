import { create } from 'zustand';
import { notificationsApi } from '../api/notifications';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await notificationsApi.getMyNotifications();
      if (res.success) {
        const notifs = res.data?.notifications || [];
        set({ 
          notifications: notifs,
          unreadCount: notifs.filter(n => !n.isRead).length,
          isLoading: false
        });
      } else {
        set({ error: res.error?.message, isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      const res = await notificationsApi.markRead(id);
      if (res.success) {
        const updated = get().notifications.map(n => 
          n._id === id ? { ...n, isRead: true } : n
        );
        set({ 
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length 
        });
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await notificationsApi.markAllRead();
      if (res.success) {
        const updated = get().notifications.map(n => ({ ...n, isRead: true }));
        set({ 
          notifications: updated,
          unreadCount: 0
        });
      }
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  },

  addRealtimeNotification: (notification) => {
    const current = get().notifications;
    const updated = [notification, ...current];
    set({
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    });
  }
}));
