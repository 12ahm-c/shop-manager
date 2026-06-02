import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/v1';

async function fetchClient(endpoint, { method = 'GET', body, ...customConfig } = {}) {
  const { accessToken, clearAuth } = useAuthStore.getState();

  const headers = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config = {
    method,
    headers: { ...headers, ...customConfig.headers },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch {
    return {
      success: false,
      data: null,
      error: { code: 'NETWORK_ERROR', message: 'Failed to connect to the server' },
      meta: null
    };
  }

  if (response.status === 401) {
    // Basic unhandled 401 response (In a real scenario, this would try to refresh token first)
    clearAuth();
    window.location.href = '/login';
    return {
      success: false,
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'Session expired' },
      meta: null
    };
  }

  const data = await response.json().catch(() => null);

  if (response.ok) {
    return data;
  } else {
    return data || {
      success: false,
      data: null,
      error: { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' },
      meta: null
    };
  }
}

export const api = {
  get: (endpoint, config) => fetchClient(endpoint, { method: 'GET', ...config }),
  post: (endpoint, body, config) => fetchClient(endpoint, { method: 'POST', body, ...config }),
  put: (endpoint, body, config) => fetchClient(endpoint, { method: 'PUT', body, ...config }),
  patch: (endpoint, body, config) => fetchClient(endpoint, { method: 'PATCH', body, ...config }),
  delete: (endpoint, config) => fetchClient(endpoint, { method: 'DELETE', ...config }),
};
