const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/financeController');
const { requireAuth, requireShop, requirePermission: can, requireAnyPermission: canAny } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.use(requireAuth, requireShop);

router.get('/monthly', can('finance.view'), ctrl.monthly);            // 12-month profit & loss
router.get('/month-detail', can('finance.view'), ctrl.monthDetail);   // best sellers / payment mix for one month
router.get('/forecast', can('finance.view'), ctrl.forecast);          // next-months prediction + reorder suggestions

router.get('/expense-categories', canAny('expenses.view', 'expenses.manage'), ctrl.categories);
router.get('/expenses', can('expenses.view'), ctrl.listExpenses);
router.post('/expenses', can('expenses.manage'), audit('expense.create', { entity: 'Expense', pick: ['amount', 'category'] }), ctrl.addExpense);
router.delete('/expenses/:id', can('expenses.manage'), audit('expense.delete', { entity: 'Expense' }), ctrl.removeExpense);

module.exports = router;
