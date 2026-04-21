import axios from 'axios';

// Determine API endpoint dynamically
const getBaseURL = () => {
  const isDev = import.meta.env.MODE === 'development';
  
  if (isDev) {
    return 'https://render-anti-gravity.onrender.com/api';
  }
  
  // Production: Check for environment variable first
  const envBackend = import.meta.env.VITE_API_URL;
  if (envBackend) {
    return envBackend;
  }
  
  // Fallback: Use Render backend (production deployment)
  return 'https://render-anti-gravity.onrender.com/api';
};

const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
  timeout: 60000, // 60 second timeout for Render cold starts
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
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      error.response = error.response || {};
      error.response.data = error.response.data || {};
      error.response.data.detail = 'Request timeout. Server may be slow or unavailable. Try again in a moment.';
      error.response.status = 504;
    }
    return Promise.reject(error);
  }
);

export const syncUsers = () => api.post('/auth/sync-users');
export const forgotPassword = (username, email) => api.post('/auth/forgot-password', { username, email });
export const changePassword = (current_password, new_password) => api.post('/auth/change-password', { current_password, new_password });

export const askAssistant = (messages) => api.post('/chat/ask', { messages });

export default api;

