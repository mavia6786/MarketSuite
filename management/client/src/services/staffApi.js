import api from './api';

// Same endpoints for both verticals: /api/shoes/salesmen/* and /api/clothes/salesmen/*
export const staffApi = (v) => {
  const base = `/${v}/salesmen`;
  return {
    list: () => api.get(base),
    create: (data) => api.post(base, data),
    update: (id, data) => api.put(`${base}/${id}`, data),
    remove: (id) => api.delete(`${base}/${id}`),
    attendance: (id, month, year) => api.get(`${base}/${id}/attendance`, { params: { month, year } }),
    mark: (id, date, isPresent) => api.post(`${base}/${id}/attendance`, { date, isPresent }),
    salaryReports: (month, year) => api.get(`${base}/salary-reports`, { params: { month, year } }),
    pay: (id, month, year, amountPaid, note) => api.post(`${base}/${id}/salary/pay`, { month, year, amountPaid, note }),
    undoPay: (id, month, year) => api.post(`${base}/${id}/salary/undo`, { month, year }),
    bonus: (id, month, year, bonus, note) => api.post(`${base}/${id}/salary/bonus`, { month, year, bonus, note }),
    addAdvance: (id, data) => api.post(`${base}/${id}/advances`, data),
    deleteAdvance: (id, advanceId) => api.delete(`${base}/${id}/advances/${advanceId}`),
  };
};
