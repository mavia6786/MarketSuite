import api from './api';

export const clothesApi = {
  getProducts: () => api.get('/clothes/products'),
  getActiveProducts: () => api.get('/clothes/products/active'),
  search: (q) => api.get('/clothes/products/search', { params: { q } }),
  getLowStock: () => api.get('/clothes/products/low-stock'),
  getCategories: () => api.get('/clothes/products/categories'),
  getBrands: () => api.get('/clothes/products/brands'),
  getProduct: (id) => api.get(`/clothes/products/${id}`),
  createProduct: (data) => api.post('/clothes/products', data),
  updateProduct: (id, data) => api.put(`/clothes/products/${id}`, data),
  updateStock: (id, quantity) => api.patch(`/clothes/products/${id}/stock`, { quantity }),
  deleteProduct: (id) => api.delete(`/clothes/products/${id}`),

  getSales: () => api.get('/clothes/sales'),
  getSalesByRange: (from, to) => api.get('/clothes/sales/range', { params: { from, to } }),
  getSale: (id) => api.get(`/clothes/sales/${id}`),
  getStats: (from, to, limit) => api.get('/clothes/sales/stats', { params: { from, to, limit } }),
  createSale: (data) => api.post('/clothes/sales', data),
  refundSale: (id) => api.post(`/clothes/sales/${id}/refund`),
  getBillHtml: (id) => api.get(`/clothes/sales/${id}/print`, { responseType: 'text', transformResponse: (r) => r }),

  getSalesmen: () => api.get('/clothes/salesmen'),
  getActiveSalesmen: () => api.get('/clothes/salesmen/active'),
  getSalesman: (id) => api.get(`/clothes/salesmen/${id}`),
  createSalesman: (data) => api.post('/clothes/salesmen', data),
  updateSalesman: (id, data) => api.put(`/clothes/salesmen/${id}`, data),
  deleteSalesman: (id) => api.delete(`/clothes/salesmen/${id}`),
  getAttendance: (id, month, year) => api.get(`/clothes/salesmen/${id}/attendance`, { params: { month, year } }),
  markAttendance: (id, data) => api.post(`/clothes/salesmen/${id}/attendance`, data),
  getSalaryReport: (id, month, year) => api.get(`/clothes/salesmen/${id}/salary-report`, { params: { month, year } }),
  getAllSalaryReports: (month, year) => api.get('/clothes/salesmen/salary-reports', { params: { month, year } }),
  markSalaryPaid: (id, month, year, amountPaid, note) =>
    api.post(`/clothes/salesmen/${id}/salary/pay`, { month, year, amountPaid, note }),
  undoSalaryPaid: (id, month, year) => api.post(`/clothes/salesmen/${id}/salary/undo`, { month, year }),
  addBonus: (id, month, year, bonus, note) => api.post(`/clothes/salesmen/${id}/salary/bonus`, { month, year, bonus, note }),
};
