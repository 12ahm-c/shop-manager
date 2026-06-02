import { api } from './client';

export const aiApi = {
  chat: async (message) => {
    return await api.post('/ai/chat', { message });
  },

  getSuggestions: async () => {
    return await api.get('/ai/suggestions');
  },

  getHealth: async () => {
    return await api.get('/ai/health');
  }
};
