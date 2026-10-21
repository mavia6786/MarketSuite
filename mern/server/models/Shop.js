const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    ownerName: { type: String, maxlength: 100, default: '' },
    phone: { type: String, maxlength: 20, default: '' },
    address: { type: String, maxlength: 500, default: '' },
    city: { type: String, maxlength: 100, default: '' },
    email: { type: String, maxlength: 200, default: null },
    // "Shoes" or "Clothes"
    type: { type: String, maxlength: 50, default: 'Shoes' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Shop', shopSchema);
