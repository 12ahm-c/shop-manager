import { useAuthStore } from '../stores/authStore';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const usersApi = {
  getMe: async () => {
    await delay(300);
    const { user } = useAuthStore.getState();
    if (!user) {
      return { success: false, data: null, error: { code: 'AUTH_REQUIRED' }, meta: null };
    }
    return {
      success: true,
      data: user,
      error: null,
      meta: null
    };
  },
  
  updateMe: async (updates) => {
    await delay(500);
    const { user, setAuth, store, accessToken, refreshToken } = useAuthStore.getState();
    
    if (!user) {
      return { success: false, data: null, error: { code: 'AUTH_REQUIRED' }, meta: null };
    }

    const updatedUser = { ...user, ...updates };
    setAuth({ user: updatedUser, store, accessToken, refreshToken });

    return {
      success: true,
      data: updatedUser,
      error: null,
      meta: null
    };
  }
};
