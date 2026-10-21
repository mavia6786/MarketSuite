const ClothingSale = require('../../models/clothes/ClothingSale');
const ClothingProduct = require('../../models/clothes/ClothingProduct');
const Counter = require('../../models/Counter');
const { deductStock, restoreStock } = require('../common/stock');
const { normalizeSaleLines, normalizeDiscount, money, round2, text } = require('../../utils/validate');
const M = require('../../utils/money');

exports.getAllSales = (shopId) => {
  const query = shopId ? { shopId } : {};
  return ClothingSale.find(query).sort({ saleDate: -1 });
};

exports.getSalesByDateRange = (from, to, shopId) => {
  const query = { saleDate: { $gte: new Date(from), $lte: new Date(to) } };
  if (shopId) query.shopId = shopId;
  return ClothingSale.find(query).sort({ saleDate: -1 });
};

exports.getSaleById = (id, shopId) => {
  const query = shopId ? { _id: id, shopId } : { _id: id };
  return ClothingSale.findOne(query);
};

exports.getSaleByInvoice = (invoiceNumber, shopId) => {
  const query = shopId ? { invoiceNumber, shopId } : { invoiceNumber };
  return ClothingSale.findOne(query);
};

exports.getTotalRevenue = async (from, to, shopId) => {
  const match = { saleDate: { $gte: new Date(from), $lte: new Date(to) }, status: 'Completed' };
  if (shopId) match.shopId = shopId;
  const result = await ClothingSale.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
  return result[0]?.total || 0;
};

exports.getTotalTransactions = (from, to, shopId) => {
  const query = { saleDate: { $gte: new Date(from), $lte: new Date(to) }, status: 'Completed' };
  if (shopId) query.shopId = shopId;
  return ClothingSale.countDocuments(query);
};

exports.getTopSellingProducts = async (from, to, limit, shopId) => {
  const match = { saleDate: { $gte: new Date(from), $lte: new Date(to) }, status: 'Completed' };
  if (shopId) match.shopId = shopId;

  const result = await ClothingSale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: limit },
  ]);

  const productIds = result.map((r) => r._id).filter(Boolean);
  const products = await ClothingProduct.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  return result.map((r) => ({
    product: productMap.get(String(r._id)) || null,
    productName: r.productName,
    totalSold: r.totalSold,
    totalRevenue: r.totalRevenue,
  }));
};

exports.processSale = async (saleData, shopId) => {
  // 1) validate input shape
  const lines = normalizeSaleLines(saleData.items);

  // 2) every line must be an existing, active product of THIS shop
  const ids = [...new Set(lines.map((l) => l.productId))];
  const found = await ClothingProduct.find({ _id: { $in: ids }, shopId });
  const products = new Map(found.map((p) => [String(p._id), p]));
  for (const l of lines) {
    if (!products.has(l.productId)) throw new Error(`Product not found: ${l.productName || l.productId}`);
  }

  // 3) totals are computed on the server — client-sent subTotal / lineTotal / totalAmount are ignored
  const items = lines.map((l) => ({ ...l, lineTotal: M.mul(l.unitPrice, l.quantity) }));
  const subTotal = M.sum(items, (i) => i.lineTotal);
  const discountAmount = normalizeDiscount(saleData.discountAmount, subTotal);
  const taxAmount = money(saleData.taxAmount === undefined || saleData.taxAmount === '' ? 0 : saleData.taxAmount, 'Tax');
  const totalAmount = M.add(M.sub(subTotal, discountAmount), taxAmount);
  const amountPaid = money(saleData.amountPaid === undefined || saleData.amountPaid === '' ? totalAmount : saleData.amountPaid, 'Amount paid');

  // 4) atomic stock deduction (conditional update; rolls back if any line is short)
  const deducted = await deductStock(ClothingProduct, shopId, lines);

  // 5) atomic, per-shop, per-day invoice number + save (stock restored if saving fails)
  try {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = await Counter.next(`cloth-inv:${shopId}:${day}`);
    const invoiceNumber = `CL-${day}-${String(seq).padStart(4, '0')}`;
    return await ClothingSale.create({
      invoiceNumber,
      customerName: text(saleData.customerName) || 'Walk-in Customer',
      customerPhone: text(saleData.customerPhone, 20) || null,
      customerEmail: text(saleData.customerEmail) || null,
      paymentMethod: text(saleData.paymentMethod, 50) || 'Cash',
      salesmanName: text(saleData.salesmanName, 100) || null,
      notes: text(saleData.notes, 1000) || null,
      subTotal,
      discountAmount,
      taxAmount,
      totalAmount,
      amountPaid,
      totalItemCount: items.reduce((n, i) => n + i.quantity, 0),
      items: items.map((i) => ({
        productId: i.productId,
        productName: products.get(i.productId).name,
        size: i.size || products.get(i.productId).size || null,
        color: i.color || products.get(i.productId).color || null,
        sku: i.sku || products.get(i.productId).sku || null,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: products.get(i.productId).costPrice || 0,
        discountAmount: 0,
        lineTotal: i.lineTotal,
      })),
      shopId,
      saleDate: new Date(),
      status: 'Completed',
    });
  } catch (err) {
    await restoreStock(ClothingProduct, shopId, deducted);
    throw err;
  }
};

// Atomically claims the sale (Completed -> Refunded) so duplicate/concurrent refunds can only succeed once.
exports.refundSale = async (saleId, shopId) => {
  const sale = await ClothingSale.findOneAndUpdate(
    { _id: saleId, shopId, status: 'Completed' },
    { $set: { status: 'Refunded', updatedAt: new Date() } },
    { new: true }
  );
  if (!sale) {
    const exists = await ClothingSale.exists({ _id: saleId, shopId });
    throw new Error(exists ? 'Sale already refunded or not refundable' : 'Sale not found');
  }
  try {
    await restoreStock(ClothingProduct, shopId, sale.items.filter((i) => i.productId).map((i) => [i.productId, i.quantity]));
  } catch (err) {
    await ClothingSale.updateOne({ _id: saleId, shopId }, { $set: { status: 'Completed' } }); // revert claim
    throw err;
  }
  return sale;
};
