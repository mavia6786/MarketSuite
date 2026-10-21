const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// Per-IP limit on credential endpoints (in addition to the per-account lockout stored in the DB).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_MAX || 30),
  message: 'Too many attempts from this address. Please wait a few minutes and try again.',
});

router.post('/login', authLimiter, ctrl.login);
router.post('/register', authLimiter, ctrl.register);
router.post('/register-shop', requireAuth, ctrl.registerShop);
router.get('/me', requireAuth, ctrl.me);
router.post('/refresh', requireAuth, ctrl.refresh);
router.post('/logout', requireAuth, ctrl.logout);
router.post('/change-password', requireAuth, authLimiter, ctrl.changePassword);

module.exports = router;
