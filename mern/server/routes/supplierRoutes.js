const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplierController');
const { requireAuth, requireShop, requirePermission: can } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.use(requireAuth, requireShop);

router.get('/', can('suppliers.view'), ctrl.getAll);
router.get('/overview', can('suppliers.view'), ctrl.getOverview);

// purchase orders
router.get('/orders', can('suppliers.view'), ctrl.getOrders);
router.get('/orders/pending-total', can('suppliers.view'), ctrl.getTotalPending);
router.post('/orders', can('suppliers.manage'), audit('po.create', { entity: 'PurchaseOrder' }), ctrl.createOrder);
router.put('/orders/:id', can('suppliers.manage'), audit('po.update', { entity: 'PurchaseOrder' }), ctrl.updateOrder);
router.post('/orders/:id/payments', can('supplier.pay'), audit('po.payment_add', { entity: 'PurchaseOrder', pick: ['amount'] }), ctrl.addPayment);
router.delete('/orders/:id/payments/:paymentId', can('supplier.pay'), audit('po.payment_delete', { entity: 'PurchaseOrder' }), ctrl.removePayment);
router.post('/orders/:id/receive', can('purchases.receive'), audit('po.receive', { entity: 'PurchaseOrder' }), ctrl.receiveOrder);
router.post('/orders/:id/cancel', can('suppliers.manage'), audit('po.cancel', { entity: 'PurchaseOrder' }), ctrl.cancelOrder);

router.get('/:id', can('suppliers.view'), ctrl.getById);
router.post('/', can('suppliers.manage'), audit('supplier.create', { entity: 'Supplier' }), ctrl.create);
router.put('/:id', can('suppliers.manage'), audit('supplier.update', { entity: 'Supplier' }), ctrl.update);
router.delete('/:id', can('suppliers.manage'), audit('supplier.delete', { entity: 'Supplier' }), ctrl.remove);

module.exports = router;
