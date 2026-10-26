const mongoose = require('mongoose');
const { ROLES } = require('../config/permissions');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, maxlength: 100, trim: true },
    email: { type: String, required: true, maxlength: 200, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Owner | Manager | Cashier | StockManager | Accountant (see config/permissions.js). Legacy values are treated as Cashier.
    role: { type: String, maxlength: 50, default: 'Cashier' },
    phone: { type: String, maxlength: 20, default: '' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
    isActive: { type: Boolean, default: true },

    // Token revocation: every JWT carries the user's tokenVersion; bumping it invalidates all issued tokens
    // (logout, password change/reset, disable, role change).
    tokenVersion: { type: Number, default: 0 },
    // Brute-force protection (stored in the DB so it works with several server instances).
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  // Users are looked up by globally-unique email / id for authentication, so the shop-scope guard is exempt here;
  // every user-MANAGEMENT query (controllers/userController.js) filters by shopId explicitly.
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, shopScopeExempt: true }
);
userSchema.index({ shopId: 1, role: 1 });
userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
