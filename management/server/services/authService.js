const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shop = require('../models/Shop');
const storefrontService = require('./storefrontService');

const BCRYPT_ROUNDS = 12;
const MAX_FAILED = Number(process.env.MAX_FAILED_LOGINS || 5);
const LOCK_MINUTES = Number(process.env.LOCKOUT_MINUTES || 15);
// A real hash used to burn the same CPU time when the email does not exist (prevents account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const hashPassword = (pw) => bcrypt.hash(pw, BCRYPT_ROUNDS);

// Returns { user } on success or { error: 'invalid' | 'locked' | 'disabled', retryAfterMin? }.
async function login(email, password) {
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).populate('shopId');
  if (!user) { await bcrypt.compare(String(password), DUMMY_HASH); return { error: 'invalid' }; }

  if (user.lockUntil && user.lockUntil > new Date()) {
    return { error: 'locked', retryAfterMin: Math.ceil((user.lockUntil - Date.now()) / 60000), user };
  }
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    // Atomic counter; lock when the threshold is reached.
    const upd = await User.findOneAndUpdate({ _id: user._id }, { $inc: { failedLogins: 1 } }, { new: true });
    if (upd && upd.failedLogins >= MAX_FAILED) {
      await User.updateOne({ _id: user._id }, { $set: { lockUntil: new Date(Date.now() + LOCK_MINUTES * 60000), failedLogins: 0 } });
      return { error: 'locked', retryAfterMin: LOCK_MINUTES, user };
    }
    return { error: 'invalid', user };
  }
  if (!user.isActive) return { error: 'disabled', user };

  await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockUntil: null, lastLoginAt: new Date() } });
  return { user };
}

async function countUsers() { return User.estimatedDocumentCount(); }

async function register({ fullName, email, password, phone }) {
  const exists = await User.findOne({ email });
  if (exists) return { success: false, message: 'An account with this email already exists.' };
  const user = await User.create({ fullName, email, passwordHash: await hashPassword(password), phone, role: 'Owner', isActive: true, passwordChangedAt: new Date() });
  return { success: true, user };
}

async function registerShop(userId, { name, ownerName, phone, address, city, email, type }) {
  const user = await User.findById(userId);
  if (!user) return { success: false, message: 'You must be logged in to register a shop.' };
  if (user.shopId) return { success: false, message: 'This account already has a shop.' };
  if (user.role !== 'Owner') return { success: false, message: 'Only an Owner account can register a shop.' };

  let shop = await Shop.create({ name, ownerName, phone, address, city, email, type, storefrontEnabled: true });
  try {
    shop = await storefrontService.ensureSlug(shop);
  } catch (err) {
    console.warn('Could not auto-generate slug on register:', err.message);
  }
  user.shopId = shop._id;
  await user.save();
  return { success: true, message: `${type} shop '${name}' created successfully!`, shop, user };
}

// Changes the password and revokes every existing token (tokenVersion bump). Caller re-issues a token if the user stays logged in.
async function setPassword(userId, newPassword, { mustChange = false } = {}) {
  const passwordHash = await hashPassword(newPassword);
  return User.findOneAndUpdate(
    { _id: userId },
    { $set: { passwordHash, mustChangePassword: mustChange, passwordChangedAt: new Date(), failedLogins: 0, lockUntil: null }, $inc: { tokenVersion: 1 } },
    { new: true }
  ).populate('shopId');
}

const revokeTokens = (userId) => User.findOneAndUpdate({ _id: userId }, { $inc: { tokenVersion: 1 } }, { new: true });

module.exports = { login, register, registerShop, setPassword, revokeTokens, hashPassword, countUsers };
