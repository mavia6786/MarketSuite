import api from './api';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (fullName, email, password, phone) =>
  api.post('/auth/register', { fullName, email, password, phone });
export const registerShop = (data) => api.post('/auth/register-shop', data);
export const me = () => api.get('/auth/me');
export const refresh = () => api.post('/auth/refresh');
export const logout = () => api.post('/auth/logout');
export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword });

// Staff accounts (Owner only) and audit log
export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }),
  unlock: (id) => api.post(`/users/${id}/unlock`),
};
export const auditApi = { list: (params) => api.get('/audit-logs', { params }) };
