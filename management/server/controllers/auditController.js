const AuditLog = require('../models/AuditLog');

// GET /api/audit-logs?action=&userId=&from=&to=&page=1&limit=50  (newest first)
exports.list = async (req, res) => {
  const q = { shopId: req.shop._id };
  if (typeof req.query.action === 'string' && req.query.action) q.action = req.query.action.slice(0, 80);
  if (typeof req.query.userId === 'string' && /^[0-9a-f]{24}$/i.test(req.query.userId)) q.userId = req.query.userId;
  const range = {};
  if (req.query.from && !isNaN(new Date(req.query.from))) range.$gte = new Date(req.query.from);
  if (req.query.to && !isNaN(new Date(req.query.to))) range.$lte = new Date(req.query.to);
  if (Object.keys(range).length) q.createdAt = range;
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const [items, total] = await Promise.all([
    AuditLog.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(q),
  ]);
  res.json({ items, total, page, limit });
};
