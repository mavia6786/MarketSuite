const Product = require('../../models/shoes/Product');

exports.getAll = (shopId) => Product.find({ shopId, isActive: true }).sort({ createdAt: -1 });

// Low stock = stockQuantity <= the product's own threshold. Compared in JS (not $expr) so it behaves the same on every
// MongoDB-compatible server; shop catalogues are small. Session 3/4 replace this with an indexed per-variant query.
const isLow = (p) => p.stockQuantity <= p.lowStockThreshold;
exports.getLowStock = async (shopId) =>
  (await Product.find({ shopId, isActive: true })).filter(isLow).sort((a, b) => a.stockQuantity - b.stockQuantity);

// Every by-id operation is scoped to the shop, so one shop can never touch another shop's data.
exports.getById = (id, shopId) => Product.findOne({ _id: id, shopId });

exports.create = (data) => Product.create({ ...data, updatedAt: new Date() });

const EDITABLE = ['name', 'brand', 'category', 'subCategory', 'costPrice', 'price', 'originalPrice', 'stockQuantity',
  'lowStockThreshold', 'sizesJson', 'colorsJson', 'imageUrl', 'description', 'isActive'];

exports.update = async (id, data, shopId) => {
  const set = { updatedAt: new Date() };
  EDITABLE.forEach((k) => { if (data[k] !== undefined) set[k] = data[k]; });
  return Product.findOneAndUpdate({ _id: id, shopId }, set, { new: true });
};

exports.remove = (id, shopId) => Product.findOneAndUpdate({ _id: id, shopId }, { isActive: false });

exports.updateStock = (id, newQuantity, shopId) =>
  Product.findOneAndUpdate({ _id: id, shopId }, { stockQuantity: Math.max(0, Number(newQuantity) || 0), updatedAt: new Date() }, { new: true });

exports.getBrands = async (shopId) => (await Product.distinct('brand', { shopId, isActive: true })).sort();

exports.getTotalProducts = (shopId) => Product.countDocuments({ shopId, isActive: true });

exports.getLowStockCount = async (shopId) => (await Product.find({ shopId, isActive: true }, 'stockQuantity lowStockThreshold')).filter(isLow).length;

exports.getOutOfStockCount = (shopId) => Product.countDocuments({ shopId, isActive: true, stockQuantity: 0 });
