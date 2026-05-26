import { create } from 'zustand';

export const useCartStore = create((set) => ({
  items: [],
  customer: null,
  paymentMethod: 'cash', // 'cash', 'card', 'credit', 'mixed'
  walletId: null,
  cashGiven: 0,
  useLoyaltyPoints: 0,

  addItem: (product) => set((state) => {
    const existingItem = state.items.find(item => item.product._id === product._id);
    if (existingItem) {
      return {
        items: state.items.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      };
    }
    return {
      items: [...state.items, { product, quantity: 1 }]
    };
  }),

  updateQuantity: (productId, quantity) => set((state) => ({
    items: state.items.map(item =>
      item.product._id === productId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    )
  })),

  removeItem: (productId) => set((state) => ({
    items: state.items.filter(item => item.product._id !== productId)
  })),

  setCustomer: (customer) => set({ customer }),
  
  setPayment: (details) => set((state) => ({
    ...state,
    ...details
  })),

  clearCart: () => set({
    items: [],
    customer: null,
    paymentMethod: 'cash',
    walletId: null,
    cashGiven: 0,
    useLoyaltyPoints: 0
  }),
}));
