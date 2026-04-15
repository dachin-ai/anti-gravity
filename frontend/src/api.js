import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';
const baseURL = isProduction 
  ? 'https://anti-gravity-123563250077.asia-southeast1.run.app/api'
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
});

// Auto-attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const syncUsers = () => api.post('/auth/sync-users');

export default api;

