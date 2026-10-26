import api from './api';

export const onlineOrdersApi = {
  getOrders: (params) => api.get('/online-orders', { params }),
  getOrder: (id) => api.get(`/online-orders/${id}`),
  updateStatus: (id, status, note) => api.patch(`/online-orders/${id}/status`, { status, note }),
};
