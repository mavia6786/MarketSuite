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
    // Public storefront (the customer-facing Store). Both are managed only through PATCH /api/shop/current/storefront.
    // slug: stable URL name, generated from the shop name (utils/slug.js). Absent on shops created before the Store existed
    //       until `npm run migrate:slugs` runs or the owner switches the online store on.
    slug: { type: String, maxlength: 80, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    // The shop is invisible to the public until its owner switches this on.
    storefrontEnabled: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Unique only among shops that have a slug (older shops have none yet).
shopSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' } } });

module.exports = mongoose.model('Shop', shopSchema);
