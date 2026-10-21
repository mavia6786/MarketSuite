const AuditLog = require('../models/AuditLog');

const SENSITIVE = /pass|token|secret|hash/i;
function cleanMeta(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE.test(k)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 200) : v;
  }
  return Object.keys(out).length ? out : null;
}

// Fire-and-forget: an audit failure must never break the business operation, but it is logged to stderr.
async function log({ req, user, shopId, action, entityType = '', entityId = '', status = null, meta = null }) {
  try {
    const u = user || (req && req.user) || null;
    await AuditLog.create({
      shopId: shopId || (req && req.shop && req.shop._id) || (u && u.shopId && (u.shopId._id || u.shopId)) || null,
      userId: u ? u._id : null,
      userEmail: u ? u.email : (meta && meta.email) || '',
      role: u ? u.role : '',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      method: req ? req.method : '',
      path: req ? String(req.originalUrl || '').split('?')[0].slice(0, 200) : '',
      status,
      ip: req ? req.ip : '',
      meta: cleanMeta(meta),
    });
  } catch (err) {
    console.error('AUDIT WRITE FAILED:', err.message);
  }
}

module.exports = { log };
