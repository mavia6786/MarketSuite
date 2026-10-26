/* Integration tests for the PUBLIC storefront API and the owner-side switches (Session 2).
 * Usage: BASE=http://localhost:5000 node tests/publicApi.js     (needs a running SEEDED server, throw-away database)
 * The test server must run with CORS_ORIGIN=http://localhost:5174 (CORS checks) and AUTH_RATE_MAX high (many logins).
 * Optional: MONGO_URI=<same db>   -> also checks that an inactive shop (isActive=false) is invisible (needs direct DB access).
 *           BASE_RL=http://localhost:5057 -> a 2nd server started with PUBLIC_RATE_MAX=5, checks the public rate limit.
 * It changes data (toggles storefront, publishes products, creates a 2nd shop): use a throw-away database. */
const BASE = process.env.BASE || 'http://localhost:5000';
const STORE_ORIGIN = process.env.STORE_ORIGIN || 'http://localhost:5174';
let pass = 0, fail = 0, skipped = 0;
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  -> ' + detail : ''}`); };
const skip = (name, why) => { skipped++; console.log(`SKIP  ${name}  (${why})`); };

async function call(method, path, token, body, headers = {}, base = BASE) {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch { /* empty */ }
  return { status: r.status, data, headers: r.headers };
}
const login = async (email, password) => (await call('POST', '/api/auth/login', null, { email, password })).data?.token;
const keysOf = (v, acc = new Set()) => { if (Array.isArray(v)) v.forEach((x) => keysOf(x, acc)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { acc.add(k); keysOf(x, acc); } return acc; };
const sameKeys = (o, keys) => JSON.stringify(Object.keys(o).sort()) === JSON.stringify([...keys].sort());
const SHOP_KEYS = ['id', 'slug', 'name', 'type', 'city', 'address', 'phone'];
const PRODUCT_KEYS = ['id', 'name', 'brand', 'category', 'subCategory', 'price', 'originalPrice', 'sizes', 'colors', 'imageUrl', 'description', 'inStock'];
const FORBIDDEN = ['costPrice', 'shopId', 'stockQuantity', 'lowStockThreshold', 'isPublished', 'isActive', 'ownerName', 'email', 'passwordHash', 'userId', 'sku', '__v', '_id', 'createdAt', 'updatedAt', 'sellingPrice', 'discountedPrice', 'sizesJson', 'colorsJson', 'storefrontEnabled'];
const leaks = (body) => FORBIDDEN.filter((k) => keysOf(body).has(k));
const stamp = Date.now();
const TEMP = 'Temp-Pass-2026a', NEW = 'Fresh-Pass-2026b';

(async () => {
  const O = await login('admin@stepup.pk', 'Admin@123');      // Shoes owner
  const CO = await login('admin@stylehub.pk', 'Admin@123');   // Clothes owner
  check('owners can log in', !!O && !!CO);

  // staff for permission checks
  const staff = {};
  for (const role of ['Cashier', 'Manager']) {
    const email = `${role.toLowerCase()}.pub${stamp}@stepup.pk`;
    await call('POST', '/api/users', O, { fullName: `${role} Pub`, email, role, password: TEMP });
    const l = await login(email, TEMP);
    staff[role] = (await call('POST', '/api/auth/change-password', l, { currentPassword: TEMP, newPassword: NEW })).data?.token;
  }
  check('Cashier and Manager tokens ready', !!staff.Cashier && !!staff.Manager);

  // ---------- owner switch: who may flip it ----------
  check('no token -> 401 on storefront switch', (await call('PATCH', '/api/shop/current/storefront', null, { storefrontEnabled: true })).status === 401);
  check('Cashier cannot switch the online store (403)', (await call('PATCH', '/api/shop/current/storefront', staff.Cashier, { storefrontEnabled: true })).status === 403);
  check('Manager cannot switch the online store (needs shop.edit, 403)', (await call('PATCH', '/api/shop/current/storefront', staff.Manager, { storefrontEnabled: true })).status === 403);
  const bad = await call('PATCH', '/api/shop/current/storefront', O, { storefrontEnabled: 'yes' });
  check('non-boolean storefrontEnabled -> 400 VALIDATION', bad.status === 400 && bad.data?.code === 'VALIDATION');
  const profile = await call('PUT', '/api/shop/current', O, { name: (await call('GET', '/api/shop/current', O)).data.name, storefrontEnabled: true, slug: 'hacked', type: 'Clothes' });
  check('profile update cannot set storefrontEnabled / slug / type', profile.status === 200 && profile.data.storefrontEnabled !== true && profile.data.slug !== 'hacked' && profile.data.type === 'Shoes');

  // ---------- invisible until enabled ----------
  const before = (await call('GET', '/api/shop/current', O)).data;
  const slugA0 = before.slug; // exists when `npm run migrate:slugs` ran, absent otherwise
  let list0 = await call('GET', '/api/public/shops');
  check('storefront OFF: shop is not in the public list', list0.status === 200 && !list0.data.data.items.some((s) => s.name === before.name));
  if (slugA0) {
    const r = await call('GET', `/api/public/shops/${slugA0}`);
    check('storefront OFF: by slug -> 404 SHOP_NOT_FOUND', r.status === 404 && r.data.code === 'SHOP_NOT_FOUND');
  } else skip('storefront OFF by-slug 404', 'shop has no slug yet; covered after disable below');

  // ---------- enable both shops ----------
  const eA = await call('PATCH', '/api/shop/current/storefront', O, { storefrontEnabled: true });
  const eC = await call('PATCH', '/api/shop/current/storefront', CO, { storefrontEnabled: true });
  const slugA = eA.data?.slug, slugC = eC.data?.slug;
  check('Owner enables the online store; shop gets a valid slug', eA.status === 200 && eA.data.storefrontEnabled === true && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slugA || ''), JSON.stringify(eA.data).slice(0, 120));
  check('clothes shop enabled with its own slug', eC.status === 200 && !!slugC && slugC !== slugA);
  check('slug is stable when toggled again', (await call('PATCH', '/api/shop/current/storefront', O, { storefrontEnabled: true })).data.slug === slugA);

  // ---------- public shops list / shop ----------
  const L = await call('GET', '/api/public/shops');
  const items = L.data?.data?.items || [];
  check('public shops list 200 with { items, total, page, pageSize }', L.status === 200 && Array.isArray(items) && typeof L.data.data.total === 'number' && L.data.data.page === 1 && L.data.data.pageSize === 12);
  check('both enabled shops are listed', items.some((s) => s.slug === slugA) && items.some((s) => s.slug === slugC));
  check('shop objects contain exactly the whitelisted fields', items.length > 0 && items.every((s) => sameKeys(s, SHOP_KEYS)), JSON.stringify(items[0]));
  check('shops list leaks no internal field', leaks(L.data).filter((k) => !['_id'].includes(k)).length === 0, leaks(L.data).join(','));
  check('?type=Clothes shows only clothes shops', (await call('GET', '/api/public/shops?type=Clothes')).data.data.items.every((s) => s.type === 'Clothes'));
  check('?type=shoes (any case) works', (await call('GET', '/api/public/shops?type=shoes')).data.data.items.every((s) => s.type === 'Shoes'));
  check('?q= matches by name', (await call('GET', '/api/public/shops?q=stylehub')).data.data.items.some((s) => s.slug === slugC));
  check('?q= with regex characters is a literal (no crash, no match)', (await call('GET', '/api/public/shops?q=.*')).data.data.total === 0 && (await call('GET', '/api/public/shops?q=(')).status === 200);
  check('?type=bogus -> 400 VALIDATION', (await call('GET', '/api/public/shops?type=bogus')).status === 400);
  const inj = await call('GET', '/api/public/shops?q[$ne]=x');
  check('operator injection ?q[$ne]= -> 400 VALIDATION (not 500)', inj.status === 400 && inj.data.code === 'VALIDATION', `status ${inj.status}`);
  check('repeated ?q=a&q=b -> 400', (await call('GET', '/api/public/shops?q=a&q=b')).status === 400);
  check('page=0 / page=abc / pageSize=51 -> 400', (await call('GET', '/api/public/shops?page=0')).status === 400 && (await call('GET', '/api/public/shops?page=abc')).status === 400 && (await call('GET', '/api/public/shops?pageSize=51')).status === 400);
  check('over-long q -> 400', (await call('GET', `/api/public/shops?q=${'a'.repeat(101)}`)).status === 400);
  const pg1 = await call('GET', '/api/public/shops?pageSize=1');
  check('pageSize=1 returns one item and the real total', pg1.data.data.items.length === 1 && pg1.data.data.total >= 2);
  check('page beyond the end -> 200 with empty items', (await call('GET', '/api/public/shops?page=9999')).data.data.items.length === 0);
  const S = await call('GET', `/api/public/shops/${slugA}`);
  check('shop by slug 200 { data: PublicShop } whitelisted', S.status === 200 && sameKeys(S.data.data, SHOP_KEYS) && S.data.data.slug === slugA && leaks(S.data).length === 0);
  for (const bad of ['nope-no-such-shop', 'UPPER', '..%2F..%2Fetc', 'a b', 'x'.repeat(200)]) {
    const r = await call('GET', `/api/public/shops/${bad}`);
    if (!(r.status === 404 && r.data?.code === 'SHOP_NOT_FOUND')) { check(`unknown/invalid slug "${bad.slice(0, 20)}" -> 404 SHOP_NOT_FOUND`, false, `status ${r.status} ${r.data?.code}`); }
  }
  check('unknown / malformed slugs -> 404 SHOP_NOT_FOUND', true);
  check('unknown /api/public route keeps NOT_FOUND code (Store tells it apart)', (await call('GET', '/api/public/nothing')).data?.code === 'NOT_FOUND');

  // ---------- products: nothing is public until published ----------
  const shoes = (await call('GET', '/api/shoes/products', O)).data;
  const pOut = shoes.find((p) => p.stockQuantity === 0) || shoes[0];
  const [p1, p2, p4] = shoes.filter((p) => p._id !== pOut._id); // four DISTINCT products
  const P0 = await call('GET', `/api/public/shops/${slugA}/products`);
  check('nothing published yet -> empty product list', P0.status === 200 && P0.data.data.total === 0 && P0.data.data.items.length === 0);
  check('products default isPublished=false', shoes.every((p) => p.isPublished === false));
  check('unpublished product by id -> 404 PRODUCT_NOT_FOUND', (await call('GET', `/api/public/shops/${slugA}/products/${p1._id}`)).data?.code === 'PRODUCT_NOT_FOUND');

  // who may publish
  check('Cashier cannot publish (403)', (await call('PATCH', `/api/shoes/products/${p1._id}/publish`, staff.Cashier, { isPublished: true })).status === 403);
  check('no token cannot publish (401)', (await call('PATCH', `/api/shoes/products/${p1._id}/publish`, null, { isPublished: true })).status === 401);
  check('non-boolean isPublished -> 400', (await call('PATCH', `/api/shoes/products/${p1._id}/publish`, O, { isPublished: 'true' })).status === 400);
  const m = await call('PATCH', `/api/shoes/products/${p1._id}/publish`, staff.Manager, { isPublished: true });
  check('Manager (products.edit) can publish', m.status === 200 && m.data.isPublished === true);
  await call('PATCH', `/api/shoes/products/${p2._id}/publish`, O, { isPublished: true });
  await call('PATCH', `/api/shoes/products/${pOut._id}/publish`, O, { isPublished: true });
  await call('PATCH', `/api/shoes/products/${p4._id}/publish`, O, { isPublished: true });
  check('other shop cannot publish my product by id (404)', (await call('PATCH', `/api/clothes/products/${p1._id}/publish`, CO, { isPublished: true })).status === 404);
  check('shoes owner is rejected on the clothes publish route (403)', (await call('PATCH', `/api/clothes/products/${p1._id}/publish`, O, { isPublished: true })).status === 403);
  check('unknown product id -> 404', (await call('PATCH', '/api/shoes/products/000000000000000000000001/publish', O, { isPublished: true })).status === 404);

  // mass assignment: isPublished in create/update bodies is ignored
  const created = await call('POST', '/api/shoes/products', O, { name: 'Mass Assign Shoe', price: 1000, costPrice: 500, stockQuantity: 5, isPublished: true });
  check('POST create with isPublished:true is ignored (stays false)', created.status === 201 && created.data.isPublished === false);
  const upd = await call('PUT', `/api/shoes/products/${created.data._id}`, O, { isPublished: true, name: 'Mass Assign Shoe' });
  check('PUT update with isPublished:true is ignored', upd.status === 200 && upd.data.isPublished === false);

  const P1 = await call('GET', `/api/public/shops/${slugA}/products`);
  const prods = P1.data?.data?.items || [];
  check('published products appear: { items, total, page, pageSize }', P1.status === 200 && prods.length === 4 && P1.data.data.total === 4 && P1.data.data.pageSize === 24);
  check('product objects contain exactly the whitelisted fields', prods.every((p) => sameKeys(p, PRODUCT_KEYS)), JSON.stringify(prods[0]));
  check('products list never contains costPrice, stock numbers, shopId, owner/staff/finance fields', leaks(P1.data).length === 0, leaks(P1.data).join(','));
  check('raw JSON text has no costPrice / shopId', !JSON.stringify(P1.data).includes('costPrice') && !JSON.stringify(P1.data).includes('shopId'));
  check('inStock is boolean and false for the out-of-stock product', prods.every((p) => typeof p.inStock === 'boolean') && prods.find((p) => p.id === pOut._id)?.inStock === (pOut.stockQuantity > 0));
  check('sizes/colors are arrays of strings', prods.every((p) => Array.isArray(p.sizes) && Array.isArray(p.colors)) && prods.some((p) => p.sizes.length > 1));
  check('inactive (deleted) products never appear', (await call('DELETE', `/api/shoes/products/${p4._id}`, O)).status === 200 && (await call('GET', `/api/public/shops/${slugA}/products`)).data.data.total === 3);
  check('unpublish removes it at once', (await call('PATCH', `/api/shoes/products/${p2._id}/publish`, O, { isPublished: false })).status === 200 && (await call('GET', `/api/public/shops/${slugA}/products`)).data.data.items.every((p) => p.id !== p2._id));
  const one = await call('GET', `/api/public/shops/${slugA}/products/${p1._id}`);
  check('product by id 200 { data: PublicProduct } whitelisted', one.status === 200 && sameKeys(one.data.data, PRODUCT_KEYS) && leaks(one.data).length === 0);
  check('malformed product id -> 404 PRODUCT_NOT_FOUND (not 400/500)', (await call('GET', `/api/public/shops/${slugA}/products/not-an-id`)).data?.code === 'PRODUCT_NOT_FOUND');
  check('?q= on products by brand', (await call('GET', `/api/public/shops/${slugA}/products?q=${encodeURIComponent(p1.brand)}`)).data.data.items.some((p) => p.id === p1._id));
  check('?category= is case-insensitive exact', (await call('GET', `/api/public/shops/${slugA}/products?category=${p1.category.toLowerCase()}`)).data.data.items.every((p) => p.category === p1.category));
  check('products ?q[$ne]= -> 400', (await call('GET', `/api/public/shops/${slugA}/products?q[$ne]=x`)).status === 400);
  check('products pageSize=1 paginates', (await call('GET', `/api/public/shops/${slugA}/products?pageSize=1`)).data.data.items.length === 1);
  const evil = await call('PUT', `/api/shoes/products/${p1._id}`, O, { imageUrl: 'javascript:alert(1)' });
  check('non-http(s) image URL is not passed on', evil.status === 200 && (await call('GET', `/api/public/shops/${slugA}/products/${p1._id}`)).data.data.imageUrl === '');
  await call('PUT', `/api/shoes/products/${p1._id}`, O, { imageUrl: p1.imageUrl });

  // categories (filter source): only categories of PUBLISHED, active products of this shop
  const cats = await call('GET', `/api/public/shops/${slugA}/categories`);
  const expectedCats = [...new Set((await call('GET', `/api/public/shops/${slugA}/products?pageSize=50`)).data.data.items.map((p) => p.category))].sort();
  check('categories: 200 { data: string[] } = categories of published products, sorted', cats.status === 200 && Array.isArray(cats.data.data) && JSON.stringify(cats.data.data) === JSON.stringify(expectedCats) && cats.data.data.length > 0, JSON.stringify(cats.data));
  check('categories: no other shop\'s categories and no internals', leaks(cats.data).length === 0 && cats.data.data.every((c) => typeof c === 'string'));
  check('categories: unknown slug -> 404 SHOP_NOT_FOUND', (await call('GET', '/api/public/shops/nope-no-shop/categories')).data?.code === 'SHOP_NOT_FOUND');

  // ---------- clothes shop: same shape, scoping bug regression ----------
  const clothes = (await call('GET', '/api/clothes/products', CO)).data;
  const c1 = clothes[0], c2 = clothes[1];
  const edit = await call('PUT', `/api/clothes/products/${c1._id}`, CO, { ...c1, discountedPrice: Math.round(c1.sellingPrice * 0.8) });
  check('clothes product edit works (was 400 "Unscoped query" before)', edit.status === 200, `status ${edit.status} ${edit.data?.message || ''}`);
  check('clothes stock update works (was 400 before)', (await call('PATCH', `/api/clothes/products/${c2._id}/stock`, CO, { quantity: c2.stockQuantity })).status === 200);
  check('Cashier-less: clothes publish by owner', (await call('PATCH', `/api/clothes/products/${c1._id}/publish`, CO, { isPublished: true })).status === 200 && (await call('PATCH', `/api/clothes/products/${c2._id}/publish`, CO, { isPublished: true })).status === 200);
  const cm = await call('POST', '/api/clothes/products', CO, { name: 'Mass Assign Tee', sellingPrice: 500, costPrice: 200, isPublished: true });
  check('clothes create ignores isPublished:true', cm.status === 201 && cm.data.isPublished === false);
  const CP = await call('GET', `/api/public/shops/${slugC}/products`);
  const cItems = CP.data?.data?.items || [];
  check('clothes shop products: identical shape to shoes', CP.status === 200 && cItems.length === 2 && cItems.every((p) => sameKeys(p, PRODUCT_KEYS)) && leaks(CP.data).length === 0, JSON.stringify(cItems[0]));
  const ci = cItems.find((p) => p.id === c1._id);
  check('clothes price is the effective (discounted) price with the original shown as originalPrice', ci && ci.price === Math.round(c1.sellingPrice * 0.8) && ci.originalPrice === c1.sellingPrice, JSON.stringify(ci));
  check('clothes product by id works', (await call('GET', `/api/public/shops/${slugC}/products/${c1._id}`)).status === 200);

  // ---------- tenant isolation ----------
  check('shop A product id under shop B (clothes) slug -> 404 PRODUCT_NOT_FOUND', (await call('GET', `/api/public/shops/${slugC}/products/${p1._id}`)).data?.code === 'PRODUCT_NOT_FOUND');
  check('clothes product id under the shoes slug -> 404', (await call('GET', `/api/public/shops/${slugA}/products/${c1._id}`)).status === 404);
  // second shop of the SAME type and SAME name -> slug collision handling
  const email2 = `second${stamp}@t.pk`;
  const reg = await call('POST', '/api/auth/register', null, { fullName: 'Second Owner', email: email2, password: 'Good-Pass-2026' });
  const T2 = reg.data?.token;
  const rs = await call('POST', '/api/auth/register-shop', T2, { name: before.name, ownerName: 'Second Owner', phone: '0300', address: 'x', city: 'Lahore', email: email2, type: 'Shoes' });
  check('second shop (same name, same type) can be registered', rs.status === 200 || rs.status === 201, `status ${rs.status} ${rs.data?.message || ''}`);
  const e2 = await call('PATCH', '/api/shop/current/storefront', T2, { storefrontEnabled: true });
  const slug2 = e2.data?.slug;
  check('slug collision handled: second shop gets -2', e2.status === 200 && slug2 === `${slugA}-2`, `slug ${slug2}`);
  check('product of shop A under shop B (same type) slug -> 404', (await call('GET', `/api/public/shops/${slug2}/products/${p1._id}`)).data?.code === 'PRODUCT_NOT_FOUND');
  check('shop B has no published products', (await call('GET', `/api/public/shops/${slug2}/products`)).data.data.total === 0);
  check("shop B's list does not include shop A's products", (await call('GET', `/api/public/shops/${slug2}/products`)).data.data.items.length === 0);

  // ---------- disabling hides everything at once ----------
  await call('PATCH', '/api/shop/current/storefront', O, { storefrontEnabled: false });
  check('disabled: not in list', !(await call('GET', '/api/public/shops')).data.data.items.some((s) => s.slug === slugA));
  check('disabled: shop by slug -> 404 SHOP_NOT_FOUND', (await call('GET', `/api/public/shops/${slugA}`)).data?.code === 'SHOP_NOT_FOUND');
  check('disabled: products list -> 404 SHOP_NOT_FOUND', (await call('GET', `/api/public/shops/${slugA}/products`)).data?.code === 'SHOP_NOT_FOUND');
  check('disabled: categories -> 404 SHOP_NOT_FOUND', (await call('GET', `/api/public/shops/${slugA}/categories`)).data?.code === 'SHOP_NOT_FOUND');
  check('disabled: product by id -> 404 SHOP_NOT_FOUND', (await call('GET', `/api/public/shops/${slugA}/products/${p1._id}`)).data?.code === 'SHOP_NOT_FOUND');
  await call('PATCH', '/api/shop/current/storefront', O, { storefrontEnabled: true });
  check('re-enabled: visible again with the same slug and published products', (await call('GET', `/api/public/shops/${slugA}/products`)).data.data.total === 2);

  if (process.env.MONGO_URI) {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI);
    const Shop = require('../models/Shop');
    await Shop.updateOne({ slug: slug2 }, { isActive: false });
    check('isActive=false shop is invisible (list + slug)', !(await call('GET', '/api/public/shops')).data.data.items.some((s) => s.slug === slug2) && (await call('GET', `/api/public/shops/${slug2}`)).data?.code === 'SHOP_NOT_FOUND');
    await Shop.updateOne({ slug: slug2 }, { isActive: true });
    await mongoose.disconnect();
  } else skip('isActive=false shop is invisible', 'set MONGO_URI to run');

  // ---------- transport rules ----------
  check('public endpoints are read-only (POST/PUT/DELETE -> 404)', (await call('POST', '/api/public/shops', null, {})).status === 404 && (await call('DELETE', `/api/public/shops/${slugC}`)).status === 404 && (await call('PUT', `/api/public/shops/${slugC}`, null, {})).status === 404);
  const hdr = await call('GET', '/api/public/shops');
  check('Cache-Control: no-cache (revalidate) on public responses', /no-cache/.test(hdr.headers.get('cache-control') || ''));
  const cors = await call('GET', '/api/public/shops', null, undefined, { Origin: STORE_ORIGIN });
  check('CORS: Store origin is allowed', cors.headers.get('access-control-allow-origin') === STORE_ORIGIN, String(cors.headers.get('access-control-allow-origin')));
  const cors2 = await call('GET', '/api/public/shops', null, undefined, { Origin: 'https://evil.example' });
  check('CORS: unknown origin gets no allow header', !cors2.headers.get('access-control-allow-origin'));
  check('existing protected routes unchanged: no token -> 401', (await call('GET', '/api/shoes/products')).status === 401 && (await call('GET', '/api/clothes/products')).status === 401);
  check('health still ok', (await call('GET', '/api/health')).data?.status === 'ok');

  if (process.env.BASE_RL) {
    let last; for (let i = 0; i < 9; i++) last = await call('GET', '/api/public/shops', null, undefined, {}, process.env.BASE_RL);
    check('public rate limit: 429 RATE_LIMITED after PUBLIC_RATE_MAX', last.status === 429 && last.data?.code === 'RATE_LIMITED', `status ${last.status}`);
    check('rate limit does not affect /api/health', (await call('GET', '/api/health', null, undefined, {}, process.env.BASE_RL)).status === 200);
  } else skip('public rate limit', 'set BASE_RL to a server started with PUBLIC_RATE_MAX=5');

  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST CRASHED', e); process.exit(2); });
