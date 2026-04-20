import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';
const baseURL = isProduction 
  ? 'https://anti-gravity-123563250077.asia-southeast1.run.app/api'
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
  timeout: 15000, // 15 second timeout for all requests
});

// Auto-attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle timeout errors with better messaging
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED' || error.message === 'timeout of 15000ms exceeded') {
      error.response = error.response || {};
      error.response.data = error.response.data || {};
      error.response.data.detail = 'Request timeout. Server may be slow or unavailable. Try again in a moment.';
      error.response.status = 504;
    }
    return Promise.reject(error);
  }
);

export const syncUsers = () => api.post('/auth/sync-users');

export const askAssistant = (messages) => api.post('/chat/ask', { messages });

export default api;

