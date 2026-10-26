const Supplier = require('../models/Supplier');
const SupplierOrder = require('../models/SupplierOrder');
const Counter = require('../models/Counter');
const ShoeProduct = require('../models/shoes/Product');
const ClothingProduct = require('../models/clothes/ClothingProduct');
const { monthRange, localParts } = require('../utils/dates');
const { money, round2, text, isId } = require('../utils/validate');
const M = require('../utils/money');

const productModelFor = (shop) => (shop.type === 'Clothes' ? ClothingProduct : ShoeProduct);
const live = (o) => o.status !== 'Cancelled';
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

// ── Suppliers ───────────────────────────────────────────────────────────────
function statsOf(orders) {
  const active = orders.filter(live);
  const received = active.filter((o) => o.status === 'Delivered');
  return {
    totalOrders: active.length,
    pendingDeliveries: active.filter((o) => o.status !== 'Delivered').length,
    totalPurchased: sum(active, (o) => o.totalAmount),
    totalPaid: sum(active, (o) => o.paidAmount),
    totalPending: sum(active, (o) => o.totalAmount - o.paidAmount),
    unitsReceived: sum(received, (o) => sum(o.items || [], (i) => i.quantity)),
    lastOrderDate: orders.length ? orders.map((o) => o.orderDate).sort((a, b) => b - a)[0] : null,
  };
}

// every supplier + their stock / payment ledger numbers
exports.getAllWithStats = async (shopId) => {
  const [suppliers, orders] = await Promise.all([
    Supplier.find({ shopId, isActive: true }).sort({ companyName: 1 }),
    SupplierOrder.find({ shopId }),
  ]);
  return suppliers.map((s) => ({
    ...s.toObject(),
    stats: statsOf(orders.filter((o) => String(o.supplierId) === String(s._id))),
  }));
};

exports.getById = (id, shopId) => Supplier.findOne({ _id: id, shopId });

exports.getDetail = async (id, shopId) => {
  const supplier = await exports.getById(id, shopId);
  if (!supplier) return null;
  const orders = await SupplierOrder.find({ supplierId: id, shopId }).sort({ orderDate: -1 });
  return { ...supplier.toObject(), orders, stats: statsOf(orders) };
};

exports.create = (data) =>
  Supplier.create({
    companyName: data.companyName, contactPerson: data.contactPerson, phone: data.phone, email: data.email,
    address: data.address, city: data.city, productsSupplied: data.productsSupplied, notes: data.notes,
    shopId: data.shopId, createdAt: new Date(),
  });

const SUPPLIER_EDITABLE = ['companyName', 'contactPerson', 'phone', 'email', 'address', 'city', 'productsSupplied', 'notes', 'isActive'];
exports.update = (id, data, shopId) => {
  const set = {};
  SUPPLIER_EDITABLE.forEach((k) => { if (data[k] !== undefined) set[k] = data[k]; });
  return Supplier.findOneAndUpdate({ _id: id, shopId }, set, { new: true });
};

exports.remove = (id, shopId) => Supplier.findOneAndUpdate({ _id: id, shopId }, { isActive: false });

// ── Orders (purchases) ──────────────────────────────────────────────────────
exports.getOrders = (shopId, status, supplierId) => {
  const query = { shopId };
  if (status) query.status = status;
  if (supplierId) query.supplierId = supplierId;
  return SupplierOrder.find(query).populate({ path: 'supplierId', match: { shopId } }).sort({ orderDate: -1 });
};

exports.createOrder = async (data, shopId) => {
  const supplier = await Supplier.findOne({ _id: data.supplierId, shopId });
  if (!supplier) throw new Error('Supplier not found');

  const items = (data.items || [])
    .filter((i) => i.productName && Number(i.quantity) > 0)
    .map((i) => {
      if (i.productId && !isId(i.productId)) throw new Error(`Invalid product for "${i.productName}"`);
      if (!Number.isInteger(Number(i.quantity))) throw new Error(`Quantity for "${i.productName}" must be a whole number`);
      return { productId: i.productId || null, productName: text(i.productName), quantity: Number(i.quantity), unitCost: money(i.unitCost === undefined || i.unitCost === '' ? 0 : i.unitCost, `Unit cost for "${i.productName}"`) };
    });

  // total comes from the items when given, otherwise from the typed amount
  const totalAmount = round2(items.length ? M.sum(items, (i) => M.mul(i.unitCost, i.quantity)) : Number(data.totalAmount) || 0);
  if (!(totalAmount > 0)) throw new Error('Order total must be greater than 0');

  const initialPaid = round2(Math.min(Math.max(Number(data.initialPayment) || 0, 0), totalAmount));
  const year = new Date().getFullYear();
  const seq = await Counter.next(`po:${shopId}:${year}`);

  return SupplierOrder.create({
    supplierId: supplier._id,
    shopId,
    orderNumber: `PO-${year}-${String(seq).padStart(4, '0')}`,
    itemsDescription: data.itemsDescription || items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
    items,
    totalAmount,
    paidAmount: initialPaid,
    payments: initialPaid > 0 ? [{ amount: initialPaid, date: new Date(), method: data.paymentMethod || 'Cash', note: 'Advance with order' }] : [],
    status: 'Pending',
    orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
    expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
    notes: data.notes || '',
  });
};

exports.updateOrder = async (id, data, shopId) => {
  const order = await SupplierOrder.findOne({ _id: id, shopId });
  if (!order) throw new Error('Order not found');
  if (data.notes !== undefined) order.notes = data.notes;
  if (data.expectedDelivery !== undefined) order.expectedDelivery = data.expectedDelivery ? new Date(data.expectedDelivery) : null;
  if (data.status === 'Confirmed' && order.status === 'Pending') order.status = 'Confirmed';
  await order.save();
  return order;
};

exports.cancelOrder = async (id, shopId) => {
  const order = await SupplierOrder.findOne({ _id: id, shopId });
  if (!order) throw new Error('Order not found');
  if (order.stockApplied) throw new Error('Stock from this order is already in inventory and cannot be cancelled');
  order.status = 'Cancelled';
  await order.save();
  return order;
};

// ── Payments (partial payments supported) ───────────────────────────────────
// The overpay check lives INSIDE the update filter, so two simultaneous payments can never exceed the total.
exports.addPayment = async (id, shopId, { amount, date, method, note }) => {
  const order = await SupplierOrder.findOne({ _id: id, shopId });
  if (!order) throw new Error('Order not found');
  if (order.status === 'Cancelled') throw new Error('Cannot pay a cancelled order');
  const amt = money(amount, 'Payment amount', { allowZero: false });
  const pending = M.sub(order.totalAmount, order.paidAmount);
  if (amt > pending + 0.005) throw new Error(`Payment exceeds pending amount (Rs. ${pending})`);

  const updated = await SupplierOrder.findOneAndUpdate(
    { _id: id, shopId, status: { $ne: 'Cancelled' }, paidAmount: { $lte: order.totalAmount - amt + 0.005 } },
    { $inc: { paidAmount: amt }, $push: { payments: { amount: amt, date: date ? new Date(date) : new Date(), method: text(method, 50) || 'Cash', note: text(note, 300) } } },
    { new: true }
  );
  if (!updated) throw new Error('Payment exceeds pending amount or order changed - please refresh and retry');
  return updated;
};

exports.removePayment = async (id, paymentId, shopId) => {
  const order = await SupplierOrder.findOne({ _id: id, shopId });
  if (!order) throw new Error('Order not found');
  const p = order.payments.id(paymentId);
  if (!p) throw new Error('Payment not found');
  // matching on payments._id makes this succeed only once, even if the request is repeated
  const updated = await SupplierOrder.findOneAndUpdate(
    { _id: id, shopId, 'payments._id': paymentId },
    { $pull: { payments: { _id: paymentId } }, $inc: { paidAmount: -p.amount } },
    { new: true }
  );
  if (!updated) throw new Error('Payment not found');
  return updated;
};

// ── Receive stock ───────────────────────────────────────────────────────────
// Marks the order delivered and adds the quantities to inventory. Cost price is
// updated using a weighted average, so profit reports stay realistic.
// The order is "claimed" atomically first (stockApplied false -> true), so receiving can only ever happen once.
exports.receiveOrder = async (id, shop) => {
  const shopId = shop._id;
  const claimed = await SupplierOrder.findOneAndUpdate(
    { _id: id, shopId, status: { $ne: 'Cancelled' }, stockApplied: { $ne: true } },
    { $set: { stockApplied: true } },
    { new: true }
  );
  if (!claimed) {
    const o = await SupplierOrder.findOne({ _id: id, shopId });
    if (!o) throw new Error('Order not found');
    if (o.status === 'Cancelled') throw new Error('Order is cancelled');
    throw new Error('Stock for this order was already received');
  }

  const Product = productModelFor(shop);
  const skipped = [];
  const applied = []; // [productId, qty] — for rollback if something fails half-way
  try {
    for (const item of claimed.items) {
      if (!item.productId) { skipped.push(item.productName); continue; }
      const p = await Product.findOne({ _id: item.productId, shopId });
      if (!p) { skipped.push(item.productName); continue; }
      const oldQty = Math.max(0, p.stockQuantity);
      const oldCost = p.costPrice || 0;
      const newQty = oldQty + item.quantity;
      const set = { updatedAt: new Date() };
      if (item.unitCost > 0) set.costPrice = Math.round(((oldQty * oldCost + item.quantity * item.unitCost) / newQty) * 100) / 100;
      // $inc (not an absolute write) so a sale happening at the same moment is never overwritten
      await Product.updateOne({ _id: item.productId, shopId }, { $inc: { stockQuantity: item.quantity }, $set: set });
      applied.push([item.productId, item.quantity]);
    }
    claimed.status = 'Delivered';
    claimed.actualDelivery = new Date();
    await claimed.save();
  } catch (err) {
    for (const [pid, qty] of applied) await Product.updateOne({ _id: pid, shopId }, { $inc: { stockQuantity: -qty } });
    await SupplierOrder.updateOne({ _id: id, shopId }, { $set: { stockApplied: false } });
    throw err;
  }
  return { order: claimed, skipped };
};

// ── Totals ──────────────────────────────────────────────────────────────────
exports.getTotalPendingAmount = async (shopId) => {
  const orders = await SupplierOrder.find({ shopId, status: { $ne: 'Cancelled' } });
  return sum(orders, (o) => o.totalAmount - o.paidAmount);
};

exports.getOverview = async (shopId) => {
  const orders = await SupplierOrder.find({ shopId });
  const active = orders.filter(live);
  const { year, month } = localParts(new Date());
  const { start, end } = monthRange(year, month);
  const inMonth = active.filter((o) => o.orderDate >= start && o.orderDate < end);
  const paidThisMonth = sum(active, (o) => sum((o.payments || []).filter((p) => p.date >= start && p.date < end), (p) => p.amount));
  return {
    totalPurchased: sum(active, (o) => o.totalAmount),
    totalPaid: sum(active, (o) => o.paidAmount),
    totalPending: sum(active, (o) => o.totalAmount - o.paidAmount),
    openDeliveries: active.filter((o) => o.status !== 'Delivered').length,
    purchasedThisMonth: sum(inMonth, (o) => o.totalAmount),
    paidThisMonth,
  };
};
