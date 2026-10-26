// Read-only data for the public Store. EVERYTHING returned here is built field by field (whitelist), never by
// serialising a database document, so a new internal field can never leak by accident.
// Visibility rules:  shop  = storefrontEnabled === true, isActive !== false, has a slug
//                    product = belongs to that shop (shopId filter, as the shop-scope guard requires), isPublished, isActive
const Shop = require('../models/Shop');
const ShoeProduct = require('../models/shoes/Product');
const ClothingProduct = require('../models/clothes/ClothingProduct');
const { isValidSlug } = require('../utils/slug');
const { isId } = require('../utils/validate');

const TYPES = ['Shoes', 'Clothes'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contains = (s) => new RegExp(escapeRegex(s), 'i'); // user text is a literal, never a pattern

const VISIBLE_SHOP = { storefrontEnabled: true, isActive: { $ne: false }, type: { $in: TYPES }, slug: { $type: 'string' } };
const SHOP_FIELDS = 'slug name type city address phone';

const toPublicShop = (s) => ({ id: String(s._id), slug: s.slug, name: s.name, type: s.type, city: s.city || '', address: s.address || '', phone: s.phone || '' });

// Allows valid http(s) image URLs as well as uploaded base64 data URIs. Blocks javascript: etc.
const safeImage = (u) => {
  if (typeof u !== 'string') return '';
  const s = u.trim();
  if (/^https?:\/\//i.test(s)) return s.slice(0, 2000);
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s)) return s;
  return '';
};
const list = (csv) => (csv ? String(csv).split(',').map((x) => x.trim()).filter(Boolean) : []);
const one = (v) => (v && String(v).trim() ? [String(v).trim()] : []);
const compareAt = (original, price) => (original != null && original > price ? original : null);

// Same output shape for both shop types.
function toPublicProduct(type, p) {
  const common = { id: String(p._id), name: p.name, brand: p.brand || '', imageUrl: safeImage(p.imageUrl), description: String(p.description || '').slice(0, 1000), inStock: p.stockQuantity > 0 };
  if (type === 'Clothes') {
    const discounted = p.discountedPrice && p.discountedPrice > 0 && p.discountedPrice < p.sellingPrice;
    const price = discounted ? p.discountedPrice : p.sellingPrice;
    return { ...common, category: p.category || '', subCategory: '', price, originalPrice: discounted ? p.sellingPrice : null, sizes: one(p.size), colors: one(p.color) };
  }
  return { ...common, category: p.category || '', subCategory: p.subCategory || '', price: p.price, originalPrice: compareAt(p.originalPrice, p.price), sizes: list(p.sizesJson), colors: list(p.colorsJson) };
}
const PRODUCT_FIELDS = {
  Shoes: 'name brand category subCategory price originalPrice stockQuantity sizesJson colorsJson imageUrl description',
  Clothes: 'name brand category sellingPrice discountedPrice stockQuantity size color imageUrl description',
};
const modelFor = (type) => (type === 'Clothes' ? ClothingProduct : ShoeProduct);

// ---- input parsing: every failure is a 400 VALIDATION error, never a 500 -------------------------------------------
class BadInput extends Error { constructor(message) { super(message); this.status = 400; this.code = 'VALIDATION'; } }

function str(v, name, max = 100) {
  if (v === undefined) return '';
  if (typeof v !== 'string') throw new BadInput(`${name} must be text.`); // blocks ?q[$ne]=x style operator objects and repeated params
  const t = v.trim();
  if (t.length > max) throw new BadInput(`${name} is too long (max ${max} characters).`);
  return t;
}
function int(v, name, def, min, max) {
  if (v === undefined || v === '') return def;
  if (typeof v !== 'string' || !/^\d{1,6}$/.test(v)) throw new BadInput(`${name} must be a whole number.`);
  const n = Number(v);
  if (n < min || n > max) throw new BadInput(`${name} must be between ${min} and ${max}.`);
  return n;
}
const paging = (query, defSize) => ({ page: int(query.page, 'page', 1, 1, 10000), pageSize: int(query.pageSize, 'pageSize', defSize, 1, 50) });

// ---- shops ---------------------------------------------------------------------------------------------------------
async function listShops(query) {
  const q = str(query.q, 'q');
  const typeRaw = str(query.type, 'type', 20);
  const { page, pageSize } = paging(query, 12);
  const filter = { ...VISIBLE_SHOP };
  if (typeRaw) {
    const type = TYPES.find((t) => t.toLowerCase() === typeRaw.toLowerCase());
    if (!type) throw new BadInput('type must be Shoes or Clothes.');
    filter.type = type;
  }
  if (q) filter.$or = [{ name: contains(q) }, { city: contains(q) }];
  const [items, total] = await Promise.all([
    Shop.find(filter).select(SHOP_FIELDS).sort({ name: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Shop.countDocuments(filter),
  ]);
  return { items: items.map(toPublicShop), total, page, pageSize };
}

// Resolves a slug to a visible shop (lean doc with _id) or null. Invalid slugs never reach the database.
const findShop = (slug) => (isValidSlug(slug) ? Shop.findOne({ ...VISIBLE_SHOP, slug }).select(SHOP_FIELDS).lean() : null);

async function getShop(slug) {
  const shop = await findShop(slug);
  return shop ? toPublicShop(shop) : null;
}

// ---- products ------------------------------------------------------------------------------------------------------
// Returns null when the shop is not visible.
async function listProducts(slug, query) {
  const q = str(query.q, 'q');
  const category = str(query.category, 'category', 50);
  const { page, pageSize } = paging(query, 24);
  const shop = await findShop(slug);
  if (!shop) return null;
  const filter = { shopId: shop._id, isPublished: true, isActive: true };
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (q) filter.$or = (shop.type === 'Clothes' ? ['name', 'brand', 'category', 'color'] : ['name', 'brand', 'category', 'subCategory']).map((f) => ({ [f]: contains(q) }));
  const Model = modelFor(shop.type);
  const [rows, total] = await Promise.all([
    Model.find(filter).select(PRODUCT_FIELDS[shop.type]).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Model.countDocuments(filter),
  ]);
  return { items: rows.map((p) => toPublicProduct(shop.type, p)), total, page, pageSize };
}

// Distinct categories of the shop's published products (for the Store's filter). null when the shop is not visible.
async function listCategories(slug) {
  const shop = await findShop(slug);
  if (!shop) return null;
  const all = await modelFor(shop.type).distinct('category', { shopId: shop._id, isPublished: true, isActive: true });
  return all.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).slice(0, 50);
}

// Returns { shopFound, product } so the route can answer SHOP_NOT_FOUND vs PRODUCT_NOT_FOUND.
async function getProduct(slug, id) {
  const shop = await findShop(slug);
  if (!shop) return { shopFound: false, product: null };
  if (!isId(id)) return { shopFound: true, product: null };
  const row = await modelFor(shop.type).findOne({ _id: id, shopId: shop._id, isPublished: true, isActive: true }).select(PRODUCT_FIELDS[shop.type]).lean();
  return { shopFound: true, product: row ? toPublicProduct(shop.type, row) : null };
}

module.exports = { listShops, getShop, listProducts, listCategories, getProduct, toPublicProduct, BadInput };
