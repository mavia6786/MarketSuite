const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const { requireAuth, requireShop, requirePermission } = require('../middleware/auth');
const audit = require('../middleware/audit');

// Only profile fields can be edited. `type`, `isActive`, `_id` etc. can never be changed from the API.
const PROFILE_FIELDS = ['name', 'ownerName', 'phone', 'address', 'city', 'email'];

// Any signed-in member of the shop may read its profile (needed for receipts/headers).
router.get('/current', requireAuth, requireShop, (req, res) => res.json(req.shop));

router.put('/current', requireAuth, requireShop, requirePermission('shop.edit'), audit('shop.update', { entity: 'Shop' }), async (req, res) => {
  const set = { updatedAt: new Date() };
  PROFILE_FIELDS.forEach((k) => { if (req.body[k] !== undefined) set[k] = String(req.body[k] ?? '').trim().slice(0, 500); });
  if (set.name !== undefined && !set.name) return res.status(400).json({ message: 'Shop name is required.' });
  const shop = await Shop.findByIdAndUpdate(req.shop._id, set, { new: true, runValidators: true });
  res.json(shop);
});

module.exports = router;
