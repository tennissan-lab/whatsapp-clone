import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_API_URL || import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Interceptor to add token to requests
api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('whatsapp_user');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
});

export default api;
