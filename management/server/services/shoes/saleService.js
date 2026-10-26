const Sale = require('../../models/shoes/Sale');
const Product = require('../../models/shoes/Product');
const Counter = require('../../models/Counter');
const { deductStock, restoreStock } = require('../common/stock');
const { normalizeSaleLines, normalizeDiscount, text } = require('../../utils/validate');
const M = require('../../utils/money');

async function generateInvoiceNumber(shopId) {
  const year = new Date().getFullYear();
  const seq = await Counter.next(`shoe-inv:${shopId}:${year}`);
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
}

exports.createSale = async (shopId, cashierId, { customerName, customerPhone, paymentMethod, discountAmount, cartItems, notes }) => {
  // 1) validate input shape (quantities, prices, discount)
  const lines = normalizeSaleLines(cartItems);

  // 2) every line must be an existing, active product of THIS shop (also gives us the cost snapshot)
  const ids = [...new Set(lines.map((l) => l.productId))];
  const found = await Product.find({ _id: { $in: ids }, shopId });
  const products = new Map(found.map((p) => [String(p._id), p]));
  for (const l of lines) {
    if (!products.has(l.productId)) throw new Error(`Product not found: ${l.productName || l.productId}`);
  }

  const subTotal = M.sum(lines, (l) => M.mul(l.unitPrice, l.quantity));
  const discount = normalizeDiscount(discountAmount, subTotal);
  const total = M.sub(subTotal, discount);

  // 3) atomic stock deduction (conditional update; rolls back if any line is short)
  const deducted = await deductStock(Product, shopId, lines);

  // 4) save the sale; if that fails, put the stock back
  try {
    const invoiceNumber = await generateInvoiceNumber(shopId);
    return await Sale.create({
      invoiceNumber,
      shopId,
      cashierId: cashierId || null,
      customerName: customerName && String(customerName).trim() ? text(customerName) : 'Walk-in Customer',
      customerPhone: text(customerPhone, 20),
      paymentMethod: text(paymentMethod, 50) || 'Cash',
      subTotal,
      discountAmount: discount,
      taxAmount: 0,
      total,
      status: 'Completed',
      saleDate: new Date(),
      notes: text(notes, 1000),
      items: lines.map((l) => ({
        productId: l.productId,
        productName: products.get(l.productId).name,
        size: l.size,
        color: l.color,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        unitCost: products.get(l.productId).costPrice || 0, // cost snapshot -> accurate profit later
      })),
    });
  } catch (err) {
    await restoreStock(Product, shopId, deducted);
    throw err;
  }
};

// Refund: atomically claims the sale (Completed -> Refunded) so concurrent/duplicate requests
// can only succeed once, then puts the items back in stock.
exports.refundSale = async (saleId, shopId) => {
  const sale = await Sale.findOneAndUpdate({ _id: saleId, shopId, status: 'Completed' }, { $set: { status: 'Refunded' } }, { new: true });
  if (!sale) {
    const exists = await Sale.exists({ _id: saleId, shopId });
    throw new Error(exists ? 'Sale already refunded or not refundable' : 'Sale not found');
  }
  try {
    await restoreStock(Product, shopId, sale.items.filter((i) => i.productId).map((i) => [i.productId, i.quantity]));
  } catch (err) {
    await Sale.updateOne({ _id: saleId, shopId }, { $set: { status: 'Completed' } }); // revert claim
    throw err;
  }
  return sale;
};

exports.getAllSales = (shopId, from, to) => {
  const query = { shopId };
  if (from || to) {
    query.saleDate = {};
    if (from) query.saleDate.$gte = new Date(from);
    if (to) query.saleDate.$lte = new Date(to);
  }
  return Sale.find(query).populate('cashierId').sort({ saleDate: -1 });
};

exports.getSaleById = (id, shopId) => Sale.findOne({ _id: id, shopId }).populate('cashierId').populate({ path: 'items.productId', match: { shopId } });

exports.getTotalRevenue = async (shopId, from, to) => {
  const query = { shopId, status: 'Completed' };
  if (from || to) {
    query.saleDate = {};
    if (from) query.saleDate.$gte = new Date(from);
    if (to) query.saleDate.$lte = new Date(to);
  }
  const result = await Sale.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$total' } } }]);
  return result[0]?.total || 0;
};

exports.getTotalOrders = (shopId, from, to) => {
  const query = { shopId, status: 'Completed' };
  if (from || to) {
    query.saleDate = {};
    if (from) query.saleDate.$gte = new Date(from);
    if (to) query.saleDate.$lte = new Date(to);
  }
  return Sale.countDocuments(query);
};

exports.getAverageOrderValue = async (shopId) => {
  const count = await Sale.countDocuments({ shopId, status: 'Completed' });
  if (count === 0) return 0;
  const result = await Sale.aggregate([
    { $match: { shopId, status: 'Completed' } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return (result[0]?.total || 0) / count;
};

exports.getLast7DaysSales = async (shopId) => {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const agg = await Sale.aggregate([
      { $match: { shopId, status: 'Completed', saleDate: { $gte: date, $lt: nextDay } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    result.push({ date, revenue: agg[0]?.total || 0 });
  }
  return result;
};

exports.getTopProducts = async (shopId, count = 5) => {
  const result = await Sale.aggregate([
    { $match: { shopId, status: 'Completed' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: { productId: '$items.productId', productName: '$items.productName' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: count },
  ]);
  return result.map((r) => ({
    productId: r._id.productId,
    productName: r._id.productName,
    totalQuantity: r.totalQuantity,
    totalRevenue: r.totalRevenue,
  }));
};
