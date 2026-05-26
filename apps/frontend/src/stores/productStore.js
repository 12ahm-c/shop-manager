import { create } from 'zustand';

export const useProductStore = create((set) => ({
  recentlyViewed: [],
  searchCache: {},

  addRecentlyViewed: (product) => set((state) => {
    const existing = state.recentlyViewed.filter(p => p._id !== product._id);
    return {
      recentlyViewed: [product, ...existing].slice(0, 10)
    };
  }),

  setSearchCache: (query, results) => set((state) => ({
    searchCache: { ...state.searchCache, [query]: results }
  })),
  
  clearSearchCache: () => set({ searchCache: {} })
}));
