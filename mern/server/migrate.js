// One-time upgrade for databases created BEFORE profit/loss support.
//   npm run migrate
// Shoe products had no cost price. Profit needs one, so we fill a placeholder
// (70% of selling price) wherever it is missing. Edit real cost prices afterwards
// in Products -> Edit, or just receive stock from a Supplier order (cost is then averaged automatically).
require('dotenv').config();
// Safety guard: this script changes existing data. It refuses to run in production and needs an explicit --yes.
if (process.env.NODE_ENV === 'production') { console.error('Refusing to run migrate in production.'); process.exit(1); }
if (!process.argv.includes('--yes')) { console.error('This writes PLACEHOLDER cost prices (70% of selling price) on shoe products that have none, which makes profit figures approximate.\nRe-run with --yes to confirm:  npm run migrate -- --yes'); process.exit(1); }
const connectDB = require('./config/db');
const ShoeProduct = require('./models/shoes/Product');

(async () => {
  await connectDB();
  const missing = await ShoeProduct.find({ $or: [{ costPrice: { $exists: false } }, { costPrice: 0 }, { costPrice: null }] });
  for (const p of missing) {
    p.costPrice = Math.round((p.price || 0) * 0.7);
    await p.save();
  }
  console.log(`Shoe products updated with placeholder cost (70% of price): ${missing.length}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
