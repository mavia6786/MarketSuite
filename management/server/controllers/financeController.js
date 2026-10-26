const svc = require('../services/financeService');
const { localParts } = require('../utils/dates');

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Request failed' });
  }
};
const yearOf = (req) => Number(req.query.year) || localParts(new Date()).year;
const monthOf = (req) => Number(req.query.month) || localParts(new Date()).month;

exports.monthly = wrap(async (req, res) => res.json(await svc.getMonthly(req.shop, yearOf(req))));
exports.monthDetail = wrap(async (req, res) => res.json(await svc.getMonthDetail(req.shop, yearOf(req), monthOf(req))));
exports.forecast = wrap(async (req, res) => res.json(await svc.getForecast(req.shop, Number(req.query.horizon) || 3)));

exports.categories = (req, res) => res.json(svc.categories);
exports.listExpenses = wrap(async (req, res) => res.json(await svc.listExpenses(req.shop._id, yearOf(req), monthOf(req))));
exports.addExpense = wrap(async (req, res) => res.status(201).json(await svc.addExpense(req.shop._id, req.body)));
exports.removeExpense = wrap(async (req, res) => {
  await svc.removeExpense(req.shop._id, req.params.id);
  res.json({ success: true });
});
