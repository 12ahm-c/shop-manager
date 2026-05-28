import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUiStore } from '../stores/uiStore';

const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    const { accessToken, store } = useAuthStore.getState();
    if (!accessToken) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(BASE_URL, {
      auth: { token: accessToken },
      query: { storeId: store?._id },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      reconnectionAttempts: Infinity,
    });

    this.setupListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      useUiStore.getState().setSocketConnected(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      useUiStore.getState().setSocketConnected(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      useUiStore.getState().setSocketConnected(false);
    });

    // Phase 7 Realtime Events
    
    // Notifications mapping
    const handleAlert = (type, data) => {
      const { addRealtimeNotification } = useNotificationStore.getState();
      const { addToast } = useUiStore.getState();
      
      const title = data?.title || type;
      const message = data?.message || 'New alert received';
      
      addRealtimeNotification({
        _id: Date.now().toString(), // Temp ID
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data
      });
      
      // We don't have a true Toast component yet, but uiStore supports it
      addToast({
        title,
        message,
        type: type.includes('critical') || type.includes('overdue') ? 'error' : 'info'
      });
    };

    this.socket.on('alert:stock_critical', (data) => handleAlert('stock_critical', data));
    this.socket.on('alert:out_of_stock', (data) => handleAlert('out_of_stock', data));
    this.socket.on('alert:debt_overdue', (data) => handleAlert('debt_overdue', data));
    this.socket.on('alert:low_wallet', (data) => handleAlert('low_wallet', data));

    this.socket.on('sale:new', (data) => {
      const { addToast } = useUiStore.getState();
      addToast({
        title: 'New Sale',
        message: `Sale ${data?.invoiceNumber || ''} completed.`,
        type: 'success'
      });
    });
    
    this.socket.on('dashboard:update', () => {
      // Here we could trigger a dashboard refresh if needed
      // For now we'll rely on the user refreshing or navigating
    });
  }

  // Allow components to subscribe to specific events (e.g., ai:response)
  subscribe(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  unsubscribe(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }
}

export const socketService = new SocketService();
