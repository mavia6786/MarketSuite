const express = require('express');
const router = express.Router();
const { requireAuth, requireShop, requireShopType, requirePermission: can } = require('../middleware/auth');
const audit = require('../middleware/audit');
const productCtrl = require('../controllers/clothes/clothingProductController');
const saleCtrl = require('../controllers/clothes/clothingSaleController');
const salesmanCtrl = require('../controllers/clothes/clothingSalesmanController');
const staffRoutes = require('./common/staffRoutes');

router.use(requireAuth, requireShop, requireShopType('Clothes'));

// Products
router.get('/products', can('products.view'), productCtrl.getAll);
router.get('/products/active', can('products.view'), productCtrl.getActive);
router.get('/products/search', can('products.view'), productCtrl.search);
router.get('/products/low-stock', can('products.view'), productCtrl.getLowStock);
router.get('/products/categories', can('products.view'), productCtrl.getCategories);
router.get('/products/brands', can('products.view'), productCtrl.getBrands);
router.get('/products/category/:category', can('products.view'), productCtrl.getByCategory);
router.get('/products/:id', can('products.view'), productCtrl.getById);
router.post('/products', can('products.create'), audit('product.create', { entity: 'Product' }), productCtrl.create);
router.put('/products/:id', can('products.edit'), audit('product.update', { entity: 'Product' }), productCtrl.update);
router.patch('/products/:id/publish', can('products.edit'), audit('product.publish', { entity: 'Product', pick: ['isPublished'] }), productCtrl.setPublished);
router.patch('/products/:id/stock', can('stock.adjust'), audit('stock.adjust', { entity: 'Product', pick: ['quantity'] }), productCtrl.updateStock);
router.delete('/products/:id', can('products.delete'), audit('product.delete', { entity: 'Product' }), productCtrl.remove);

// Sales
router.get('/sales', can('sales.view'), saleCtrl.getAll);
router.get('/sales/range', can('sales.view'), saleCtrl.getByDateRange);
router.get('/sales/stats', can('reports.view'), saleCtrl.getStats);
router.get('/sales/invoice/:invoiceNumber', can('sales.view'), saleCtrl.getByInvoice);
router.get('/sales/:id/print', can('sales.view'), saleCtrl.printBill);
router.get('/sales/:id', can('sales.view'), saleCtrl.getById);
router.post('/sales', can('sales.create'), audit('sale.create', { entity: 'Sale' }), saleCtrl.create);
router.post('/sales/:id/refund', can('sales.refund'), audit('sale.refund', { entity: 'Sale' }), saleCtrl.refund);

// Salesmen / attendance / advances / salary (shared payroll engine)
router.use('/salesmen', staffRoutes(salesmanCtrl));

module.exports = router;
