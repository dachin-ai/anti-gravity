import axios from 'axios';

// Determine API endpoint dynamically
const getBaseURL = () => {
  const isDev = import.meta.env.MODE === 'development';
  const envBackend = import.meta.env.VITE_API_URL;

  // Allow overriding API target in both dev and production.
  // Useful when local backend is unavailable but frontend is tested locally.
  if (envBackend) {
    return envBackend;
  }
  
  if (isDev) {
    return 'http://localhost:8000/api';
  }
  
  // Fallback: Use Cloud Run backend (production deployment)
  return 'https://anti-gravity-123563250077.asia-southeast1.run.app/api';
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

// Access management
export const submitAccessRequest = (tool_key) => api.post('/access/request', { tool_key });
export const getMyAccessRequests = () => api.get('/access/my-requests');
export const getAccessRequests = () => api.get('/access/requests');
export const approveAccessRequest = (id) => api.put(`/access/requests/${id}/approve`);
export const rejectAccessRequest = (id) => api.put(`/access/requests/${id}/reject`);
export const getAllUsersWithPermissions = () => api.get('/access/users');
export const updateUserPermissions = (username, permissions) => api.put(`/access/users/${username}/permissions`, { permissions });

export default api;

