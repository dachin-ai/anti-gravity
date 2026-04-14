import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';
const baseURL = isProduction 
  ? 'https://anti-gravity-123563250077.asia-southeast1.run.app/api'
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
});

export default api;
