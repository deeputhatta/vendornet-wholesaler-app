import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.vendornet.in/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const res = await axios.post(`${API_URL}/auth/refresh-token`, {
          refresh_token: refreshToken
        });
        const newToken = res.data.token;
        await AsyncStorage.setItem('token', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (mobile) => api.post('/auth/send-otp', { mobile }),
  verifyOTP: (mobile, otp, role, name, fcm_token) =>
    api.post('/auth/verify-otp', { mobile, otp, role, name, fcm_token }),
  refreshToken: (refresh_token) => api.post('/auth/refresh-token', { refresh_token })
};

export const searchAPI = {
  search: (q, filters = {}) => api.get('/search', { params: { q, ...filters } }),
};

export const catalogueAPI = {
  getCategories: () => api.get('/categories'),
  getProducts: (category_id) => api.get('/products', { params: { category_id } }),
  getVariants: (product_id) => api.get(`/products/${product_id}/variants`),
};

export const listingsAPI = {
  getListings: (filters = {}) => api.get('/listings', { params: filters }),
};

export const ordersAPI = {
  placeOrder: (orderData) => api.post('/orders', orderData),
  getMyOrders: () => api.get('/orders/my'),
};

export const invoicesAPI = {
  getMyInvoices: () => api.get('/invoices/my'),
  getInvoice: (id) => api.get(`/invoices/${id}`),
};

export const deliveryAPI = {
  getLocation: (subOrderId) => api.get(`/delivery/${subOrderId}/location`),
};

export default api;