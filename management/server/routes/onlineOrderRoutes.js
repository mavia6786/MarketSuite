const express = require('express');
const router = express.Router();
const { requireAuth, requireShop, requireAnyPermission } = require('../middleware/auth');
const orderSvc = require('../services/onlineOrderService');

// All endpoints in this router are shop-scoped and authenticated
router.use(requireAuth, requireShop);

// List orders for this shop (Owner, Manager, Cashier, Accountant can view)
router.get(
  '/',
  requireAnyPermission('sales.view', 'sales.create'),
  async (req, res) => {
    const data = await orderSvc.listShopOrders(req.shop._id, req.query);
    res.json({ data });
  }
);

// Get single order detail
router.get(
  '/:id',
  requireAnyPermission('sales.view', 'sales.create'),
  async (req, res) => {
    const orders = await orderSvc.listShopOrders(req.shop._id, { q: req.params.id, pageSize: 1 });
    const order = orders.items.find((o) => String(o._id) === req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.', code: 'ORDER_NOT_FOUND' });
    }
    res.json({ data: order });
  }
);

// Update order status (Confirm, Ship, Deliver, Cancel)
router.patch(
  '/:id/status',
  requireAnyPermission('sales.create'),
  async (req, res) => {
    const { status, note } = req.body;
    const updated = await orderSvc.updateOrderStatus(req.shop._id, req.params.id, {
      status,
      note,
      user: req.user,
    });
    res.json({ data: updated });
  }
);

// Validation errors handler
router.use((err, req, res, next) => {
  if (err instanceof orderSvc.BadOrderInput) {
    return res.status(err.status || 400).json({ message: err.message, code: err.code });
  }
  next(err);
});

module.exports = router;
