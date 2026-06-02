import { create } from 'zustand';
import { walletsApi } from '../api/wallets';

export const useWalletStore = create((set) => ({
  wallets: [],
  isLoading: false,
  error: null,

  fetchWallets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await walletsApi.getWallets();
      if (response.success) {
        set({ wallets: response.data.wallets, isLoading: false });
      } else {
        set({ error: response.error?.message || 'Failed to fetch wallets', isLoading: false });
      }
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
