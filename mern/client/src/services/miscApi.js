import api from './api';

export const supplierApi = {
  getAll: () => api.get('/suppliers'),
  getOverview: () => api.get('/suppliers/overview'),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  remove: (id) => api.delete(`/suppliers/${id}`),

  getOrders: (params) => api.get('/suppliers/orders', { params }),
  createOrder: (data) => api.post('/suppliers/orders', data),
  addPayment: (orderId, data) => api.post(`/suppliers/orders/${orderId}/payments`, data),
  removePayment: (orderId, paymentId) => api.delete(`/suppliers/orders/${orderId}/payments/${paymentId}`),
  receiveOrder: (orderId) => api.post(`/suppliers/orders/${orderId}/receive`),
  cancelOrder: (orderId) => api.post(`/suppliers/orders/${orderId}/cancel`),
  getTotalPending: () => api.get('/suppliers/orders/pending-total'),
};

export const shopApi = {
  getCurrent: () => api.get('/shop/current'),
  updateCurrent: (data) => api.put('/shop/current', data),
};
