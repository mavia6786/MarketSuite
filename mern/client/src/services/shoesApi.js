import api from './api';

export const shoesApi = {
  getProducts: () => api.get('/shoes/products'),
  getLowStock: () => api.get('/shoes/products/low-stock'),
  getBrands: () => api.get('/shoes/products/brands'),
  getProductStats: () => api.get('/shoes/products/stats'),
  getProduct: (id) => api.get(`/shoes/products/${id}`),
  createProduct: (data) => api.post('/shoes/products', data),
  updateProduct: (id, data) => api.put(`/shoes/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/shoes/products/${id}`),
  updateStock: (id, quantity) => api.patch(`/shoes/products/${id}/stock`, { quantity }),

  getSales: (from, to) => api.get('/shoes/sales', { params: { from, to } }),
  getSale: (id) => api.get(`/shoes/sales/${id}`),
  createSale: (data) => api.post('/shoes/sales', data),
  refundSale: (id) => api.post(`/shoes/sales/${id}/refund`),
  getDashboardStats: (from, to) => api.get('/shoes/sales/dashboard-stats', { params: { from, to } }),

  getSalesmen: () => api.get('/shoes/salesmen'),
  createSalesman: (data) => api.post('/shoes/salesmen', data),
  updateSalesman: (id, data) => api.put(`/shoes/salesmen/${id}`, data),
  deleteSalesman: (id) => api.delete(`/shoes/salesmen/${id}`),
  getAttendance: (id, month, year) => api.get(`/shoes/salesmen/${id}/attendance`, { params: { month, year } }),
  markAttendance: (id, date, isPresent) => api.post(`/shoes/salesmen/${id}/attendance`, { date, isPresent }),
};
