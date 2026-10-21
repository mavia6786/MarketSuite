const productService = require('../../services/shoes/productService');

exports.getAll = async (req, res) => res.json(await productService.getAll(req.shop._id));

exports.getLowStock = async (req, res) => res.json(await productService.getLowStock(req.shop._id));

exports.getById = async (req, res) => {
  const product = await productService.getById(req.params.id, req.shop._id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

exports.create = async (req, res) => {
  const product = await productService.create({ ...req.body, shopId: req.shop._id });
  res.status(201).json(product);
};

exports.update = async (req, res) => {
  const product = await productService.update(req.params.id, req.body, req.shop._id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

exports.remove = async (req, res) => {
  await productService.remove(req.params.id, req.shop._id);
  res.json({ success: true });
};

exports.updateStock = async (req, res) => {
  const product = await productService.updateStock(req.params.id, req.body.quantity, req.shop._id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

exports.getBrands = async (req, res) => res.json(await productService.getBrands(req.shop._id));

exports.getStats = async (req, res) => {
  const [total, lowStock, outOfStock] = await Promise.all([
    productService.getTotalProducts(req.shop._id),
    productService.getLowStockCount(req.shop._id),
    productService.getOutOfStockCount(req.shop._id),
  ]);
  res.json({ total, lowStock, outOfStock });
};
