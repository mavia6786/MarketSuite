const express = require('express');
const router = express.Router();
const { requireAuth, requireShop, requireShopType, requirePermission: can, requireAnyPermission: canAny } = require('../middleware/auth');
const audit = require('../middleware/audit');
const productCtrl = require('../controllers/shoes/productController');
const saleCtrl = require('../controllers/shoes/saleController');
const salesmanCtrl = require('../controllers/shoes/salesmanController');
const staffRoutes = require('./common/staffRoutes');

router.use(requireAuth, requireShop, requireShopType('Shoes'));

// Products
router.get('/products', can('products.view'), productCtrl.getAll);
router.get('/products/low-stock', can('products.view'), productCtrl.getLowStock);
router.get('/products/brands', can('products.view'), productCtrl.getBrands);
router.get('/products/stats', can('reports.view'), productCtrl.getStats);
router.get('/products/:id', can('products.view'), productCtrl.getById);
router.post('/products', can('products.create'), audit('product.create', { entity: 'Product' }), productCtrl.create);
router.put('/products/:id', can('products.edit'), audit('product.update', { entity: 'Product' }), productCtrl.update);
router.delete('/products/:id', can('products.delete'), audit('product.delete', { entity: 'Product' }), productCtrl.remove);
router.patch('/products/:id/publish', can('products.edit'), audit('product.publish', { entity: 'Product', pick: ['isPublished'] }), productCtrl.setPublished);
router.patch('/products/:id/stock', can('stock.adjust'), audit('stock.adjust', { entity: 'Product', pick: ['quantity'] }), productCtrl.updateStock);

// Sales
router.get('/sales', can('sales.view'), saleCtrl.getAll);
router.get('/sales/dashboard-stats', can('reports.view'), saleCtrl.getDashboardStats);
router.get('/sales/:id', can('sales.view'), saleCtrl.getById);
router.post('/sales', can('sales.create'), audit('sale.create', { entity: 'Sale' }), saleCtrl.create);
router.post('/sales/:id/refund', can('sales.refund'), audit('sale.refund', { entity: 'Sale' }), saleCtrl.refund);

// Salesmen / attendance / advances / salary (shared payroll engine)
router.use('/salesmen', staffRoutes(salesmanCtrl));

module.exports = router;
