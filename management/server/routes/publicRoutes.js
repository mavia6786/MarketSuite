// PUBLIC API for the customer Store. No login. Mounted at /api/public (see server.js).
// Returns only whitelisted fields for shops whose owner switched the online store on and products marked published.
// Supports guest checkout with Cash on Delivery (COD) and customer order lookup.
const express = require('express');
const router = express.Router();
const rateLimit = require('../middleware/rateLimit');
const svc = require('../services/publicService');
const orderSvc = require('../services/onlineOrderService');

// Own per-IP limit, stricter than the global API one (anonymous and cacheable-looking).
router.use(rateLimit({ windowMs: 60 * 1000, max: Number(process.env.PUBLIC_RATE_MAX || 120) }));
// Browsers/proxies may keep a copy only if they revalidate first (ETag).
router.use((req, res, next) => { res.set('Cache-Control', 'no-cache'); next(); });

// Dedicated order placement rate limit to prevent spam (30 orders per 15 min per IP)
const orderRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.ORDER_RATE_MAX || 30),
  message: 'Too many order requests. Please try again in a few minutes.',
});

const shopNotFound = (res) => res.status(404).json({ message: 'Shop not found.', code: 'SHOP_NOT_FOUND' });

router.get('/shops', async (req, res) => res.json({ data: await svc.listShops(req.query) }));

router.get('/shops/:slug', async (req, res) => {
  const shop = await svc.getShop(req.params.slug);
  if (!shop) return shopNotFound(res);
  res.json({ data: shop });
});

router.get('/shops/:slug/products', async (req, res) => {
  const result = await svc.listProducts(req.params.slug, req.query);
  if (!result) return shopNotFound(res);
  res.json({ data: result });
});

router.get('/shops/:slug/categories', async (req, res) => {
  const categories = await svc.listCategories(req.params.slug);
  if (!categories) return shopNotFound(res);
  res.json({ data: categories });
});

router.get('/shops/:slug/products/:id', async (req, res) => {
  const { shopFound, product } = await svc.getProduct(req.params.slug, req.params.id);
  if (!shopFound) return shopNotFound(res);
  if (!product) return res.status(404).json({ message: 'Product not found.', code: 'PRODUCT_NOT_FOUND' });
  res.json({ data: product });
});

// Guest Checkout: Place order with Cash on Delivery
router.post('/shops/:slug/orders', orderRateLimit, async (req, res) => {
  const result = await orderSvc.createOnlineOrder(req.params.slug, req.body);
  res.status(201).json({ data: result });
});

// Customer Order Lookup: Track order by order number and phone
router.post('/orders/lookup', async (req, res) => {
  const result = await orderSvc.lookupOnlineOrder(req.body);
  res.json({ data: result });
});

// Invalid input / validation error handling
router.use((err, req, res, next) => {
  if (err instanceof svc.BadInput || err instanceof orderSvc.BadOrderInput) {
    return res.status(err.status || 400).json({ message: err.message, code: err.code });
  }
  next(err);
});

module.exports = router;
