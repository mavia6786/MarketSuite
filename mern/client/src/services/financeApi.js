import api from './api';

export const financeApi = {
  monthly: (year) => api.get('/finance/monthly', { params: { year } }),
  monthDetail: (year, month) => api.get('/finance/month-detail', { params: { year, month } }),
  forecast: () => api.get('/finance/forecast'),
  categories: () => api.get('/finance/expense-categories'),
  expenses: (year, month) => api.get('/finance/expenses', { params: { year, month } }),
  addExpense: (data) => api.post('/finance/expenses', data),
  removeExpense: (id) => api.delete(`/finance/expenses/${id}`),
};
