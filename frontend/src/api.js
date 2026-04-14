import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';
const baseURL = isProduction 
  ? (import.meta.env.VITE_API_URL || 'https://render-anti-gravity.onrender.com') + '/api'
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
});

export default api;
