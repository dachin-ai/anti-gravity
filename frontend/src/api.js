import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';
const baseURL = isProduction 
  ? '/api'
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
});

export const syncUsers = () => api.post('/auth/sync-users');

export default api;
