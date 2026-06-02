import { useAuthStore } from '../stores/authStore';
// Using mock responses based on docs/API-contract.md exactly

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const authApi = {
  login: async (phone, password, storeId) => {
    await delay(800); // Simulate network
    
    if (password === 'password') {
      const data = {
        accessToken: "mock-jwt-access-token",
        refreshToken: "mock-jwt-refresh-token",
        user: { _id: "65f000000000000000000001", role: "admin", name: "Admin User" },
        store: { _id: storeId || "65f2a1b3c4d5e6f7a8b9c0d1", name: "Magasin Central" }
      };
      // Store locally just for the mock to work smoothly
      useAuthStore.getState().setAuth(data);

      return {
        success: true,
        data,
        error: null,
        meta: null
      };
    }

    return {
      success: false,
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid credentials', fields: {} },
      meta: null
    };
  },

  refresh: async () => {
    await delay(300);
    return {
      success: true,
      data: { accessToken: "mock-jwt-access-token-2" },
      error: null,
      meta: null
    };
  },

  logout: async () => {
    await delay(300);
    useAuthStore.getState().clearAuth();
    return {
      success: true,
      data: null,
      error: null,
      meta: null
    };
  },

  getMe: async () => {
    await delay(400);
    const { user, store } = useAuthStore.getState();
    if (!user) {
      return {
        success: false,
        data: null,
        error: { code: 'AUTH_REQUIRED', message: 'Missing authentication' },
        meta: null
      };
    }
    return {
      success: true,
      data: { user, store },
      error: null,
      meta: null
    };
  }
};
