

// Reports often return binary data (PDF/XLSX), so we need a custom fetch wrapper
// for them since the default client expects JSON `{success, data, error}`.
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/v1';

async function fetchReport(endpoint) {
  const { accessToken, clearAuth } = useAuthStore.getState();
  
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { headers });
  
  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to generate report');
  }

  return await response.blob();
}

function buildQueryString(params) {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const reportsApi = {
  getDailyCash: async (params) => {
    return await fetchReport(`/reports/daily-cash${buildQueryString(params)}`);
  },

  getProfitability: async (params) => {
    return await fetchReport(`/reports/profitability${buildQueryString(params)}`);
  },

  getTopProducts: async (params) => {
    return await fetchReport(`/reports/top-products${buildQueryString(params)}`);
  },

  getAging: async (params) => {
    return await fetchReport(`/reports/aging${buildQueryString(params)}`);
  }
};
