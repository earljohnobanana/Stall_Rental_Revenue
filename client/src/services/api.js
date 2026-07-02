import axios from 'axios';

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout:         30000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// Restore token from localStorage on app init
const token = localStorage.getItem('srms_token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Request deduplication
const pendingRequests = new Map();

api.interceptors.request.use((config) => {
  if (config.method?.toLowerCase() === 'get') {
    const key = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
    if (pendingRequests.has(key)) pendingRequests.get(key).abort();
    const controller = new AbortController();
    config.signal    = controller.signal;
    pendingRequests.set(key, controller);
    config._dedupKey = key;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.config._dedupKey) pendingRequests.delete(res.config._dedupKey);
    return res;
  },
  (err) => {
    if (err.config?._dedupKey) pendingRequests.delete(err.config._dedupKey);

    // Swallow cancelled requests silently
    if (axios.isCancel(err) || err.name === 'CanceledError') {
      return Promise.reject({ canceled: true });
    }

    // Session expired or unauthorized — clear and redirect to login
    if (err.response?.status === 401) {
      localStorage.removeItem('srms_user');
      localStorage.removeItem('srms_token');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    if (err.response?.status === 429) {
      console.warn('Rate limit hit:', err.response.data?.message);
    }

    if (!err.response) {
      console.error('Network error — server may be down.');
    }

    return Promise.reject(err);
  }
);

export default api;