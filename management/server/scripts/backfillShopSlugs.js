// Gives every shop that has no public slug one (generated from its name; collisions get -2, -3 ...).
//   npm run migrate:slugs            -> dry run: prints what would be set, writes nothing
//   npm run migrate:slugs -- --yes   -> applies it
// Safe to repeat (shops that already have a slug are skipped) and safe in production: it only ADDS the slug field and
// never switches a storefront on (storefrontEnabled stays false until the owner enables it).
require('dotenv').config();
const connectDB = require('../config/db');
const Shop = require('../models/Shop');
const { ensureSlug } = require('../services/storefrontService');

(async () => {
  const apply = process.argv.includes('--yes');
  await connectDB();
  const missing = await Shop.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] }).select('name');
  if (!missing.length) { console.log('All shops already have a slug.'); process.exit(0); }
  for (const shop of missing) {
    if (!apply) { console.log(`would set slug for "${shop.name}" (${shop._id})`); continue; }
    const s = await ensureSlug(shop);
    console.log(`"${shop.name}" -> ${s.slug}`);
  }
  console.log(apply ? `Done: ${missing.length} shop(s) updated.` : `Dry run: ${missing.length} shop(s) need a slug. Re-run with --yes to apply:  npm run migrate:slugs -- --yes`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
