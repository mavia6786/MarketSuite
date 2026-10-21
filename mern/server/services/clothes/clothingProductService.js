const ClothingProduct = require('../../models/clothes/ClothingProduct');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getAllProducts = (shopId) => {
  const query = shopId ? { shopId } : {};
  return ClothingProduct.find(query).sort({ createdAt: -1 });
};

exports.getActiveProducts = (shopId) => {
  const query = shopId ? { shopId, isActive: true } : { isActive: true };
  return ClothingProduct.find(query).sort({ name: 1 });
};

exports.getProductById = (id, shopId) => {
  const query = shopId ? { _id: id, shopId } : { _id: id };
  return ClothingProduct.findOne(query);
};

exports.getProductsByCategory = (category, shopId) => {
  const query = shopId ? { category, isActive: true, shopId } : { category, isActive: true };
  return ClothingProduct.find(query);
};

exports.searchProducts = (q, shopId) => {
  const regex = new RegExp(escapeRegex(String(q || '').slice(0, 100)), 'i'); // user text is a literal, never a pattern
  const query = {
    isActive: true,
    $or: [{ name: regex }, { brand: regex }, { category: regex }, { color: regex }, { sku: regex }],
  };
  if (shopId) query.shopId = shopId;
  return ClothingProduct.find(query);
};

// Compared in JS (not $expr) so it works on every MongoDB-compatible server; replaced by an indexed query in Sessions 3/4.
exports.getLowStockProducts = async (shopId) => {
  const query = { isActive: true };
  if (shopId) query.shopId = shopId;
  return (await ClothingProduct.find(query)).filter((p) => p.stockQuantity <= p.lowStockThreshold);
};

exports.getCategories = async (shopId) => {
  const query = shopId ? { isActive: true, shopId } : { isActive: true };
  const cats = await ClothingProduct.distinct('category', query);
  return cats.sort();
};

exports.getBrands = async (shopId) => {
  const query = shopId ? { isActive: true, shopId } : { isActive: true };
  const brands = await ClothingProduct.distinct('brand', query);
  return brands.sort();
};

exports.addProduct = (data, shopId) =>
  ClothingProduct.create({ ...data, shopId: shopId || data.shopId, isActive: true, createdAt: new Date() });

exports.updateProduct = async (id, data, shopId) => {
  const existing = await ClothingProduct.findById(id);
  if (!existing) throw new Error('Product not found');
  if (shopId && String(existing.shopId) !== String(shopId)) throw new Error('Unauthorized');

  Object.assign(existing, {
    name: data.name,
    brand: data.brand,
    sku: data.sku,
    category: data.category,
    gender: data.gender,
    size: data.size,
    color: data.color,
    material: data.material,
    season: data.season,
    costPrice: data.costPrice,
    sellingPrice: data.sellingPrice,
    discountedPrice: data.discountedPrice,
    stockQuantity: data.stockQuantity,
    lowStockThreshold: data.lowStockThreshold,
    imageUrl: data.imageUrl,
    description: data.description,
    isActive: data.isActive,
    updatedAt: new Date(),
  });
  await existing.save();
  return existing;
};

exports.updateStock = async (id, newQuantity, shopId) => {
  const product = await ClothingProduct.findById(id);
  if (!product) throw new Error('Product not found');
  if (shopId && String(product.shopId) !== String(shopId)) throw new Error('Unauthorized');
  product.stockQuantity = Math.max(0, newQuantity);
  product.updatedAt = new Date();
  await product.save();
  return product;
};

exports.deleteProduct = async (id, shopId) => {
  const product = await ClothingProduct.findById(id);
  if (!product) throw new Error('Product not found');
  if (shopId && String(product.shopId) !== String(shopId)) throw new Error('Unauthorized');
  product.isActive = false;
  product.updatedAt = new Date();
  await product.save();
};
