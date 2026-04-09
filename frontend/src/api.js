import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';
const baseURL = isProduction 
  ? 'https://freemir-antigravity.onrender.com/api' 
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
});

export default api;
