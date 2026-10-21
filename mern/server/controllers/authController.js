const bcrypt = require('bcryptjs');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { signToken } = require('../middleware/auth');
const { validatePassword } = require('../utils/password');
const { permissionsFor, normalizeRole } = require('../config/permissions');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function serializeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: normalizeRole(user.role),
    permissions: permissionsFor(user.role),
    phone: user.phone,
    shopId: user.shopId ? (user.shopId._id || user.shopId) : null,
    isActive: user.isActive,
    mustChangePassword: !!user.mustChangePassword,
  };
}

function serializeShop(shop) {
  if (!shop) return null;
  return { id: shop._id, name: shop.name, ownerName: shop.ownerName, phone: shop.phone, address: shop.address, city: shop.city, email: shop.email, type: shop.type, isActive: shop.isActive };
}

// Public sign-up policy. In production it is OFF unless ALLOW_PUBLIC_SIGNUP=true; the very first account (empty database)
// is always allowed so a fresh deployment can create its Owner. After that, Owners add staff via /api/users.
const signupOpen = () => (process.env.ALLOW_PUBLIC_SIGNUP ? process.env.ALLOW_PUBLIC_SIGNUP === 'true' : process.env.NODE_ENV !== 'production');

exports.login = async (req, res) => {
  const email = str(req.body && req.body.email, 200).toLowerCase();
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  const r = await authService.login(email, password);
  if (r.error === 'locked') {
    auditService.log({ req, user: r.user, action: 'auth.login_locked', meta: { email } });
    return res.status(423).json({ message: `Account temporarily locked after too many failed attempts. Try again in ${r.retryAfterMin} minute(s).`, code: 'ACCOUNT_LOCKED' });
  }
  if (r.error === 'disabled') {
    auditService.log({ req, user: r.user, action: 'auth.login_disabled', meta: { email } });
    return res.status(403).json({ message: 'This account has been disabled. Contact the shop owner.', code: 'ACCOUNT_DISABLED' });
  }
  if (r.error) {
    auditService.log({ req, user: r.user, action: 'auth.login_failed', meta: { email } });
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  auditService.log({ req, user: r.user, action: 'auth.login' });
  res.json({ token: signToken(r.user), user: serializeUser(r.user), shop: serializeShop(r.user.shopId) });
};

exports.register = async (req, res) => {
  if (!signupOpen() && (await authService.countUsers()) > 0) {
    return res.status(403).json({ message: 'Public sign-up is disabled. Ask the shop owner to create your account.', code: 'SIGNUP_DISABLED' });
  }
  const fullName = str(req.body && req.body.fullName, 100);
  const email = str(req.body && req.body.email, 200).toLowerCase();
  const password = req.body && req.body.password;
  const phone = str(req.body && req.body.phone, 20);
  if (!fullName || !email || !password) return res.status(400).json({ message: 'Full name, email and password are required.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  const pwErr = validatePassword(password, { email, fullName });
  if (pwErr) return res.status(400).json({ message: pwErr });

  const result = await authService.register({ fullName, email, password, phone });
  if (!result.success) return res.status(409).json({ message: result.message });
  auditService.log({ req, user: result.user, action: 'auth.register' });
  res.json({ token: signToken(result.user), user: serializeUser(result.user), shop: null });
};

exports.registerShop = async (req, res) => {
  const name = str(req.body && req.body.name, 200);
  const type = req.body && req.body.type;
  if (!name || !type) return res.status(400).json({ message: 'Shop name and type are required.' });
  if (!['Shoes', 'Clothes'].includes(type)) return res.status(400).json({ message: "Shop type must be 'Shoes' or 'Clothes'." });
  const email = str(req.body.email, 200);
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid shop email address.' });

  const result = await authService.registerShop(req.user._id, {
    name, ownerName: str(req.body.ownerName, 100), phone: str(req.body.phone, 20), address: str(req.body.address, 500),
    city: str(req.body.city, 100), email: email || null, type,
  });
  if (!result.success) return res.status(400).json({ message: result.message });
  auditService.log({ req, user: result.user, shopId: result.shop._id, action: 'shop.register', entityType: 'Shop', entityId: result.shop._id, meta: { type } });
  res.json({ message: result.message, user: serializeUser(result.user), shop: serializeShop(result.shop) });
};

exports.me = async (req, res) => res.json({ user: serializeUser(req.user), shop: serializeShop(req.shop) });

// Issues a fresh token for a still-valid session (client calls this to extend a session without re-entering the password).
exports.refresh = async (req, res) => res.json({ token: signToken(req.user), user: serializeUser(req.user), shop: serializeShop(req.shop) });

// Logout = revoke every token of this user (all devices). Documented behaviour.
exports.logout = async (req, res) => {
  await authService.revokeTokens(req.user._id);
  auditService.log({ req, action: 'auth.logout' });
  res.json({ message: 'Logged out.' });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') return res.status(400).json({ message: 'Current and new password are required.' });
  if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    auditService.log({ req, action: 'auth.password_change_failed' });
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  const pwErr = validatePassword(newPassword, { email: req.user.email, fullName: req.user.fullName });
  if (pwErr) return res.status(400).json({ message: pwErr });
  if (newPassword === currentPassword) return res.status(400).json({ message: 'New password must be different from the current one.' });

  const updated = await authService.setPassword(req.user._id, newPassword);
  auditService.log({ req, action: 'auth.password_change' });
  res.json({ message: 'Password changed.', token: signToken(updated), user: serializeUser(updated), shop: serializeShop(updated.shopId) });
};

exports.serializeUser = serializeUser;
