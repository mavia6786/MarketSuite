const svc = require('../../services/clothes/clothingProductService');

exports.getAll = async (req, res) => res.json(await svc.getAllProducts(req.shop._id));

exports.getActive = async (req, res) => res.json(await svc.getActiveProducts(req.shop._id));

exports.getById = async (req, res) => {
  const p = await svc.getProductById(req.params.id, req.shop._id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json(p);
};

exports.getByCategory = async (req, res) => res.json(await svc.getProductsByCategory(req.params.category, req.shop._id));

exports.search = async (req, res) => res.json(await svc.searchProducts(req.query.q || '', req.shop._id));

exports.getLowStock = async (req, res) => res.json(await svc.getLowStockProducts(req.shop._id));

exports.getCategories = async (req, res) => res.json(await svc.getCategories(req.shop._id));

exports.getBrands = async (req, res) => res.json(await svc.getBrands(req.shop._id));

exports.create = async (req, res) => {
  const p = await svc.addProduct(req.body, req.shop._id);
  res.status(201).json(p);
};

exports.update = async (req, res) => {
  try {
    res.json(await svc.updateProduct(req.params.id, req.body, req.shop._id));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    res.json(await svc.updateStock(req.params.id, req.body.quantity, req.shop._id));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await svc.deleteProduct(req.params.id, req.shop._id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
