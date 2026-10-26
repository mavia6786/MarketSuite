// Owner-side storefront settings: giving a shop its public slug and switching the online store on/off.
const Shop = require('../models/Shop');
const { uniqueSlug, isValidSlug } = require('../utils/slug');

const NO_SLUG = { $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] };
const isTaken = async (slug) => !!(await Shop.exists({ slug }));

// Returns the shop with a slug, creating one when it has none. Safe under concurrency: the slug is only written when the
// shop still has none, and a unique-index collision (another shop took the same slug a moment ago) retries with a new one.
async function ensureSlug(shop) {
  if (isValidSlug(shop.slug)) return shop;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await uniqueSlug(shop.name, isTaken);
    try {
      const updated = await Shop.findOneAndUpdate({ _id: shop._id, ...NO_SLUG }, { $set: { slug } }, { new: true });
      if (updated) return updated;
      return await Shop.findById(shop._id); // someone else set it first
    } catch (err) {
      if (err.code !== 11000) throw err; // slug collision -> pick the next free one
    }
  }
  throw new Error('Could not allocate a unique shop slug.');
}

async function setStorefrontEnabled(shop, enabled) {
  if (enabled) await ensureSlug(shop); // a shop can only go public with a slug
  return Shop.findByIdAndUpdate(shop._id, { $set: { storefrontEnabled: enabled, updatedAt: new Date() } }, { new: true });
}

module.exports = { ensureSlug, setStorefrontEnabled };
