// Creates an Owner account AND its shop from the command line — the supported way to onboard a customer when
// public sign-up is disabled (production default). Never deletes or overwrites anything.
//   OWNER_PASSWORD='Choose-A-Strong-One-1' node scripts/createOwner.js --email owner@shop.pk --name "Ahmed Khan" --shop "StepUp Shoes" --type Shoes [--city Lahore] [--phone 0300...]
// The password is read from the OWNER_PASSWORD environment variable so it never appears in shell history arguments or logs.
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.plugin(require('../plugins/shopScope'));
const connectDB = require('../config/db');
const User = require('../models/User');
const Shop = require('../models/Shop');
const authService = require('../services/authService');
const { validatePassword } = require('../utils/password');

const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : undefined; };

(async () => {
  const email = (arg('email') || '').toLowerCase().trim(), name = arg('name'), shopName = arg('shop'), type = arg('type');
  const password = process.env.OWNER_PASSWORD;
  if (!email || !name || !shopName || !['Shoes', 'Clothes'].includes(type) || !password) {
    console.error('Usage: OWNER_PASSWORD=... node scripts/createOwner.js --email <e> --name <full name> --shop <shop name> --type Shoes|Clothes [--city c] [--phone p]');
    process.exit(1);
  }
  const pwErr = validatePassword(password, { email, fullName: name });
  if (pwErr) { console.error('Password rejected: ' + pwErr); process.exit(1); }
  await connectDB();
  if (await User.findOne({ email })) { console.error('An account with that email already exists. Nothing was changed.'); process.exit(1); }
  const shop = await Shop.create({ name: shopName, ownerName: name, phone: arg('phone') || '', city: arg('city') || '', address: arg('address') || '', email, type });
  await User.create({ fullName: name, email, passwordHash: await authService.hashPassword(password), role: 'Owner', shopId: shop._id, isActive: true, passwordChangedAt: new Date() });
  console.log(`Created ${type} shop "${shopName}" with Owner ${email}.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
