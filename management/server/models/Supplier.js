const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, maxlength: 200 },
    contactPerson: { type: String, maxlength: 100, default: '' },
    phone: { type: String, maxlength: 20, default: '' },
    email: { type: String, maxlength: 200, default: '' },
    address: { type: String, maxlength: 500, default: '' },
    city: { type: String, maxlength: 100, default: '' },
    productsSupplied: { type: String, maxlength: 500, default: '' },
    isActive: { type: Boolean, default: true },
    notes: { type: String, maxlength: 500, default: '' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('Supplier', supplierSchema);
