const svc = require('../services/supplierService');

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Request failed' });
  }
};

exports.getAll = wrap(async (req, res) => res.json(await svc.getAllWithStats(req.shop._id)));

exports.getOverview = wrap(async (req, res) => res.json(await svc.getOverview(req.shop._id)));

exports.getById = wrap(async (req, res) => {
  const detail = await svc.getDetail(req.params.id, req.shop._id);
  if (!detail) return res.status(404).json({ message: 'Supplier not found' });
  res.json(detail);
});

exports.create = wrap(async (req, res) => {
  if (!req.body.companyName || !String(req.body.companyName).trim()) throw new Error('Company name is required');
  res.status(201).json(await svc.create({ ...req.body, shopId: req.shop._id }));
});

exports.update = wrap(async (req, res) => {
  const s = await svc.update(req.params.id, req.body, req.shop._id);
  if (!s) return res.status(404).json({ message: 'Supplier not found' });
  res.json(s);
});

exports.remove = wrap(async (req, res) => {
  await svc.remove(req.params.id, req.shop._id);
  res.json({ success: true });
});

exports.getOrders = wrap(async (req, res) => res.json(await svc.getOrders(req.shop._id, req.query.status, req.query.supplierId)));

exports.createOrder = wrap(async (req, res) => res.status(201).json(await svc.createOrder(req.body, req.shop._id)));

exports.updateOrder = wrap(async (req, res) => res.json(await svc.updateOrder(req.params.id, req.body, req.shop._id)));

exports.cancelOrder = wrap(async (req, res) => res.json(await svc.cancelOrder(req.params.id, req.shop._id)));

exports.addPayment = wrap(async (req, res) => res.status(201).json(await svc.addPayment(req.params.id, req.shop._id, req.body)));

exports.removePayment = wrap(async (req, res) =>
  res.json(await svc.removePayment(req.params.id, req.params.paymentId, req.shop._id)));

exports.receiveOrder = wrap(async (req, res) => res.json(await svc.receiveOrder(req.params.id, req.shop)));

exports.getTotalPending = wrap(async (req, res) => res.json({ totalPending: await svc.getTotalPendingAmount(req.shop._id) }));
