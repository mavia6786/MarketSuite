const mongoose = require('mongoose');

// Append-only record of who did what. Never updated or deleted by the application.
const auditLogSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userEmail: { type: String, default: '' },
    role: { type: String, default: '' },
    action: { type: String, required: true, maxlength: 80 },   // e.g. 'auth.login', 'product.delete', 'user.create'
    entityType: { type: String, default: '' },
    entityId: { type: String, default: '' },
    method: { type: String, default: '' },
    path: { type: String, default: '' },
    status: { type: Number, default: null },                    // HTTP status for route-level entries
    ip: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: null }, // small, non-sensitive details only (never passwords/tokens)
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
auditLogSchema.index({ shopId: 1, createdAt: -1 });
auditLogSchema.index({ shopId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
