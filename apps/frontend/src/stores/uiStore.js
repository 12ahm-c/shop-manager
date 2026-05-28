import { create } from 'zustand';

export const useUiStore = create((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  toasts: [],
  addToast: (toast) => 
    set((state) => ({
      toasts: [...state.toasts, { id: Date.now(), ...toast }]
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    })),
    
  globalLoading: false,
  setGlobalLoading: (isLoading) => set({ globalLoading: isLoading }),
  
  socketConnected: true,
  setSocketConnected: (isConnected) => set({ socketConnected: isConnected })
}));
