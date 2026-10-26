// Per-shop staff accounts. Only an Owner (users.manage) can use these. Every query is scoped to req.shop._id.
const User = require('../models/User');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { validatePassword } = require('../utils/password');
const { ASSIGNABLE_ROLES, normalizeRole } = require('../config/permissions');
const { isId } = require('../utils/validate');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const ser = (u) => ({
  id: u._id, fullName: u.fullName, email: u.email, role: normalizeRole(u.role), phone: u.phone, isActive: u.isActive,
  mustChangePassword: !!u.mustChangePassword, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
  locked: !!(u.lockUntil && u.lockUntil > new Date()),
});

async function findInShop(req, res) {
  if (!isId(req.params.id)) { res.status(400).json({ message: 'Invalid user id.' }); return null; }
  const u = await User.findOne({ _id: req.params.id, shopId: req.shop._id });
  if (!u) { res.status(404).json({ message: 'User not found.' }); return null; }
  return u;
}

exports.list = async (req, res) => {
  const users = await User.find({ shopId: req.shop._id }).sort({ createdAt: 1 });
  res.json(users.map(ser));
};

exports.create = async (req, res) => {
  const fullName = str(req.body.fullName, 100);
  const email = str(req.body.email, 200).toLowerCase();
  const role = req.body.role;
  const password = req.body.password;
  if (!fullName || !email || !password || !role) return res.status(400).json({ message: 'Full name, email, role and a temporary password are required.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}.` });
  const pwErr = validatePassword(password, { email, fullName });
  if (pwErr) return res.status(400).json({ message: pwErr });
  if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });

  const user = await User.create({
    fullName, email, role, phone: str(req.body.phone, 20), shopId: req.shop._id, isActive: true,
    passwordHash: await authService.hashPassword(password), mustChangePassword: true, passwordChangedAt: new Date(), createdBy: req.user._id,
  });
  auditService.log({ req, action: 'user.create', entityType: 'User', entityId: user._id, status: 201, meta: { email, role } });
  res.status(201).json(ser(user));
};

exports.update = async (req, res) => {
  const u = await findInShop(req, res); if (!u) return;
  const isSelf = String(u._id) === String(req.user._id);
  const isOwner = normalizeRole(u.role) === 'Owner';
  const set = {}; let revoke = false; const changes = {};

  if (req.body.fullName !== undefined) { const v = str(req.body.fullName, 100); if (!v) return res.status(400).json({ message: 'Full name cannot be empty.' }); set.fullName = v; }
  if (req.body.phone !== undefined) set.phone = str(req.body.phone, 20);
  if (req.body.role !== undefined && req.body.role !== u.role) {
    if (isOwner) return res.status(400).json({ message: "An Owner's role cannot be changed." });
    if (!ASSIGNABLE_ROLES.includes(req.body.role)) return res.status(400).json({ message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}.` });
    set.role = req.body.role; changes.role = req.body.role; revoke = true; // permissions changed -> old tokens end
  }
  if (req.body.isActive !== undefined && Boolean(req.body.isActive) !== u.isActive) {
    if (isSelf || isOwner) return res.status(400).json({ message: 'You cannot disable an Owner account (including your own).' });
    set.isActive = Boolean(req.body.isActive); changes.isActive = set.isActive; if (!set.isActive) revoke = true;
  }
  const update = { $set: set }; if (revoke) update.$inc = { tokenVersion: 1 };
  const saved = Object.keys(set).length ? await User.findOneAndUpdate({ _id: u._id, shopId: req.shop._id }, update, { new: true }) : u;
  if (Object.keys(changes).length) auditService.log({ req, action: 'user.update', entityType: 'User', entityId: u._id, status: 200, meta: changes });
  res.json(ser(saved));
};

// Owner sets a temporary password; the user must change it at next login. All their sessions end.
exports.resetPassword = async (req, res) => {
  const u = await findInShop(req, res); if (!u) return;
  if (normalizeRole(u.role) === 'Owner' && String(u._id) !== String(req.user._id)) return res.status(400).json({ message: "Another Owner's password cannot be reset here." });
  const pwErr = validatePassword(req.body.newPassword, { email: u.email, fullName: u.fullName });
  if (pwErr) return res.status(400).json({ message: pwErr });
  const updated = await authService.setPassword(u._id, req.body.newPassword, { mustChange: String(u._id) !== String(req.user._id) });
  auditService.log({ req, action: 'user.reset_password', entityType: 'User', entityId: u._id, status: 200 });
  res.json(ser(updated));
};

exports.unlock = async (req, res) => {
  const u = await findInShop(req, res); if (!u) return;
  await User.updateOne({ _id: u._id, shopId: req.shop._id }, { $set: { failedLogins: 0, lockUntil: null } });
  auditService.log({ req, action: 'user.unlock', entityType: 'User', entityId: u._id, status: 200 });
  res.json({ message: 'Account unlocked.' });
};
