const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { normalizeRole, permissionsFor } = require('../config/permissions');
const auditService = require('../services/auditService');

const PLACEHOLDER_SECRETS = ['', 'dev-secret-change-me', 'change-this-to-a-long-random-string'];
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (process.env.NODE_ENV === 'production' && (PLACEHOLDER_SECRETS.includes(JWT_SECRET) || JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
}
if (PLACEHOLDER_SECRETS.includes(JWT_SECRET)) console.warn('WARNING: using a placeholder JWT_SECRET (development only).');
// Access-token lifetime. Short-ish by default; the client can call POST /api/auth/refresh to get a fresh one while the session is valid.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// The token carries the user's tokenVersion (tv). Bumping User.tokenVersion revokes every token issued before.
function signToken(user) {
  return jwt.sign({ userId: String(user._id), tv: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Requires a valid, non-revoked token. Loads the user (with shop) onto req.user / req.shop / req.permissions.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated.', code: 'NO_TOKEN' });

    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ message: 'Invalid or expired token.', code: 'BAD_TOKEN' }); }
    const user = await User.findById(decoded.userId).populate('shopId');
    if (!user || !user.isActive) return res.status(401).json({ message: 'Not authenticated.', code: 'NO_USER' });
    if ((decoded.tv || 0) !== (user.tokenVersion || 0)) return res.status(401).json({ message: 'Session ended. Please log in again.', code: 'TOKEN_REVOKED' });
    if (user.shopId && user.shopId.isActive === false) return res.status(403).json({ message: 'This shop is disabled.', code: 'SHOP_DISABLED' });

    // Forced password change: only the auth endpoints are reachable until it is done.
    if (user.mustChangePassword && !String(req.originalUrl).startsWith('/api/auth/')) {
      return res.status(403).json({ message: 'You must change your password before continuing.', code: 'PASSWORD_CHANGE_REQUIRED' });
    }

    req.user = user;
    req.shop = user.shopId || null; // populated Shop document or null
    req.role = normalizeRole(user.role);
    req.permissions = permissionsFor(user.role);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.', code: 'BAD_TOKEN' });
  }
}

// Requires the user to also have a shop set up (mirrors AuthService.HasShop).
function requireShop(req, res, next) {
  if (!req.shop) return res.status(400).json({ message: 'You must set up a shop first.' });
  next();
}

// Shop-type isolation: a Shoes shop must never use the Clothes API (and vice versa).
// Usage: router.use(requireAuth, requireShop, requireShopType('Shoes'))
function requireShopType(type) {
  return (req, res, next) => {
    if (!req.shop || req.shop.type !== type) {
      return res.status(403).json({ message: `This endpoint is only available to ${type} shops.` });
    }
    next();
  };
}

// RBAC: the caller must hold ALL listed permissions. Must run after requireAuth.
function requirePermission(...perms) {
  if (!perms.length) throw new Error('requirePermission needs at least one permission');
  const mw = (req, res, next) => {
    if (!req.permissions) return res.status(401).json({ message: 'Not authenticated.', code: 'NO_TOKEN' });
    const missing = perms.filter((p) => !req.permissions.includes(p));
    if (missing.length) {
      auditService.log({ req, action: 'auth.forbidden', status: 403, meta: { required: perms.join(',') } });
      return res.status(403).json({ message: 'You do not have permission to do this.', code: 'FORBIDDEN', required: perms });
    }
    next();
  };
  mw.requiredPermissions = perms; // introspected by tests/routeCoverage.js
  return mw;
}

// RBAC: the caller must hold AT LEAST ONE of the listed permissions.
function requireAnyPermission(...perms) {
  const mw = (req, res, next) => {
    if (!req.permissions) return res.status(401).json({ message: 'Not authenticated.', code: 'NO_TOKEN' });
    if (!perms.some((p) => req.permissions.includes(p))) {
      auditService.log({ req, action: 'auth.forbidden', status: 403, meta: { required: perms.join('|') } });
      return res.status(403).json({ message: 'You do not have permission to do this.', code: 'FORBIDDEN', required: perms });
    }
    next();
  };
  mw.requiredPermissions = perms;
  return mw;
}

module.exports = { signToken, requireAuth, requireShop, requireShopType, requirePermission, requireAnyPermission, JWT_SECRET };
