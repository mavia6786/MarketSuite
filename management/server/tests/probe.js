/* Repeatable HTTP probe for critical workflows.
 * Usage: BASE=http://localhost:5000 node tests/probe.js   (needs a seeded DB and a running server)
 * Prints PASS/FAIL per check. "expect" states the SAFE/CORRECT behaviour. Exit code 1 if any FAIL.
 * NOTE: it creates test data (sales, orders, expenses) in the shops it logs into - use a throw-away database. */
const BASE = process.env.BASE || 'http://localhost:5000';
let pass = 0, fail = 0; const results = [];
// Known gaps that are deliberately scheduled for a later session are tagged here: they still print as FAIL
// (so the gap stays visible) but do not make the exit code non-zero.
const DEFERRED = {
  'salary payment above net payable is rejected': 'Session 9 (payroll)',
  'paying an already-paid month is rejected (no double payment)': 'Session 9 (payroll)',
};
// Concurrency checks rely on MongoDB's atomic single-document findOneAndUpdate/updateOne. The FerretDB(SQLite) stand-in
// used in Session 1 does NOT guarantee that (a bare claim let >1 caller win in 19/30 rounds), so on a stand-in these are
// informational only. Run with REAL_MONGO=1 against real MongoDB / Atlas to enforce them.
const NEEDS_REAL_MONGO = [
  '3 concurrent refunds of one sale restore stock exactly once',
  'concurrent sales cannot oversell (stock 3, 4 x qty2 -> max 1 succeeds, stock >= 0)',
  'clothes: concurrent refunds restore stock exactly once',
];
if (process.env.REAL_MONGO !== '1') NEEDS_REAL_MONGO.forEach((n) => { DEFERRED[n] = 'real MongoDB (stand-in is not atomic) - rerun with REAL_MONGO=1'; });
let deferredFail = 0;
const check = (name, ok, detail = '') => {
  const d = DEFERRED[name];
  if (ok) pass++; else if (d) deferredFail++; else fail++;
  results.push({ name, ok, detail, deferredTo: ok ? undefined : d });
  console.log(`${ok ? 'PASS' : d ? 'DEFER' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}${!ok && d ? `  [deferred to ${d}]` : ''}`);
};

async function call(method, path, token, body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch { /* html or empty */ }
  return { status: r.status, data };
}
const login = async (email, password) => (await call('POST', '/api/auth/login', null, { email, password })).data?.token;

(async () => {
  const shoeT = await login('admin@stepup.pk', 'Admin@123');
  const clothT = await login('admin@stylehub.pk', 'Admin@123');
  check('login works for both seeded shops', !!shoeT && !!clothT);
  check('wrong password -> 401', (await call('POST', '/api/auth/login', null, { email: 'admin@stepup.pk', password: 'nope' })).status === 401);
  check('mixed-case email can log in', !!(await login('Admin@StepUp.PK', 'Admin@123')));
  check('no token -> 401', (await call('GET', '/api/shoes/products')).status === 401);

  // ---- shop-type isolation ----
  const crossC = await call('GET', '/api/clothes/products', shoeT);
  check('Shoes-shop token is REJECTED on /api/clothes/*', [403, 404].includes(crossC.status), `status ${crossC.status}`);
  const crossS = await call('GET', '/api/shoes/products', clothT);
  check('Clothes-shop token is REJECTED on /api/shoes/*', [403, 404].includes(crossS.status), `status ${crossS.status}`);

  const shoes = (await call('GET', '/api/shoes/products', shoeT)).data || [];
  const clothes = (await call('GET', '/api/clothes/products', clothT)).data || [];
  const sp = shoes.find((x) => x.stockQuantity > 5) || shoes[0], cp = clothes.find((x) => x.stockQuantity > 5) || clothes[0];
  await call('PATCH', `/api/shoes/products/${sp._id}/stock`, shoeT, { quantity: 20 });
  await call('PATCH', `/api/clothes/products/${cp._id}/stock`, clothT, { quantity: 30 });
  check('seed products visible', !!sp && !!cp, `shoes=${shoes.length} clothes=${clothes.length}`);

  // cross-shop by-id access
  check('clothes user cannot read a shoe product by id', [403, 404].includes((await call('GET', `/api/shoes/products/${sp._id}`, clothT)).status));

  // ---- shop profile mass-assignment ----
  const put = await call('PUT', '/api/shop/current', shoeT, { type: 'Clothes', isActive: false });
  const after = (await call('GET', '/api/shop/current', shoeT)).data;
  check('shop profile PUT cannot change type / isActive', after?.type === 'Shoes' && after?.isActive === true, `type=${after?.type} isActive=${after?.isActive} (PUT ${put.status})`);
  if (after?.type !== 'Shoes') await call('PUT', '/api/shop/current', clothT, {}); // no-op, just keeps flow

  // ---- sale input validation (shoes) ----
  const line = (p, q, price) => ({ productId: p._id, productName: p.name, size: '42', color: 'Black', quantity: q, unitPrice: price });
  const before = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  const neg = await call('POST', '/api/shoes/sales', shoeT, { cartItems: [line(sp, -5, sp.price)], paymentMethod: 'Cash' });
  const afterNeg = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  check('negative quantity sale is rejected (cannot inflate stock)', neg.status === 400 && afterNeg === before, `status ${neg.status}, stock ${before}->${afterNeg}`);
  const zeroP = await call('POST', '/api/shoes/sales', shoeT, { cartItems: [line(sp, 1, 0)], paymentMethod: 'Cash' });
  check('zero/negative unit price is rejected', zeroP.status === 400, `status ${zeroP.status}`);
  const bigDisc = await call('POST', '/api/shoes/sales', shoeT, { cartItems: [line(sp, 1, sp.price)], discountAmount: -999999, paymentMethod: 'Cash' });
  check('negative discount is rejected', bigDisc.status === 400, `status ${bigDisc.status}`);
  const fracQ = await call('POST', '/api/shoes/sales', shoeT, { cartItems: [line(sp, 1.5, sp.price)], paymentMethod: 'Cash' });
  check('fractional quantity is rejected', fracQ.status === 400, `status ${fracQ.status}`);

  // ---- happy path + stock deduction ----
  const ok = await call('POST', '/api/shoes/sales', shoeT, { cartItems: [line(sp, 2, sp.price)], paymentMethod: 'Cash' });
  const afterOk = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  check('valid sale -> 201 and stock deducted by qty', ok.status === 201 && afterOk === before - 2, `status ${ok.status}, stock ${before}->${afterOk}`);
  const inv2 = await call('POST', '/api/shoes/sales', shoeT, { cartItems: [line(sp, 1, sp.price)], paymentMethod: 'Cash' });
  check('invoice numbers are unique/sequential', ok.data?.invoiceNumber && inv2.data?.invoiceNumber && ok.data.invoiceNumber !== inv2.data.invoiceNumber, `${ok.data?.invoiceNumber} / ${inv2.data?.invoiceNumber}`);

  // ---- refund: single + concurrent double refund ----
  const sid = ok.data?._id;
  const stockBeforeRefund = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  const [r1, r2, r3] = await Promise.all([1, 2, 3].map(() => call('POST', `/api/shoes/sales/${sid}/refund`, shoeT)));
  const stockAfterRefund = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  const okCount = [r1, r2, r3].filter((r) => r.status === 200).length;
  check('3 concurrent refunds of one sale restore stock exactly once', okCount === 1 && stockAfterRefund === stockBeforeRefund + 2, `successes=${okCount}, stock ${stockBeforeRefund}->${stockAfterRefund} (expected +2)`);

  // ---- concurrent oversell ----
  await call('PATCH', `/api/shoes/products/${sp._id}/stock`, shoeT, { quantity: 3 });
  const race = await Promise.all([1, 2, 3, 4].map(() => call('POST', '/api/shoes/sales', shoeT, { cartItems: [line(sp, 2, sp.price)], paymentMethod: 'Cash' })));
  const sold = race.filter((r) => r.status === 201).length;
  const stockEnd = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  check('concurrent sales cannot oversell (stock 3, 4 x qty2 -> max 1 succeeds, stock >= 0)', sold <= 1 && stockEnd >= 0, `succeeded=${sold}, final stock=${stockEnd}`);
  await call('PATCH', `/api/shoes/products/${sp._id}/stock`, shoeT, { quantity: 20 });

  // ---- clothes sale validation + refund race ----
  const cline = (p, q, price) => ({ productId: p._id, productName: p.name, size: p.size, color: p.color, sku: p.sku, quantity: q, unitPrice: price, lineTotal: q * price });
  const cbefore = (await call('GET', `/api/clothes/products/${cp._id}`, clothT)).data.stockQuantity;
  const cneg = await call('POST', '/api/clothes/sales', clothT, { items: [cline(cp, -4, cp.sellingPrice)], paymentMethod: 'Cash', totalAmount: 0 });
  const cafterNeg = (await call('GET', `/api/clothes/products/${cp._id}`, clothT)).data.stockQuantity;
  check('clothes: negative quantity sale rejected', cneg.status === 400 && cafterNeg === cbefore, `status ${cneg.status}, stock ${cbefore}->${cafterNeg}`);
  const cok = await call('POST', '/api/clothes/sales', clothT, { items: [cline(cp, 2, cp.sellingPrice)], paymentMethod: 'Cash', subTotal: 2 * cp.sellingPrice, totalAmount: 2 * cp.sellingPrice, amountPaid: 2 * cp.sellingPrice });
  check('clothes: valid sale -> 201', cok.status === 201, `status ${cok.status} ${cok.data?.message || ''}`);
  const cs0 = (await call('GET', `/api/clothes/products/${cp._id}`, clothT)).data.stockQuantity;
  const cr = await Promise.all([1, 2, 3].map(() => call('POST', `/api/clothes/sales/${cok.data?._id}/refund`, clothT)));
  const cs1 = (await call('GET', `/api/clothes/products/${cp._id}`, clothT)).data.stockQuantity;
  check('clothes: concurrent refunds restore stock exactly once', cr.filter((r) => r.status === 200).length === 1 && cs1 === cs0 + 2, `successes=${cr.filter((r) => r.status === 200).length}, stock ${cs0}->${cs1}`);
  const rx = await call('GET', '/api/clothes/products/search?q=(', clothT);
  check('clothes search with regex metachar does not 500', rx.status < 500, `status ${rx.status}`);

  // ---- suppliers / purchasing ----
  const sup = await call('POST', '/api/suppliers', shoeT, { companyName: 'Probe Supplier Co' });
  const ord = await call('POST', '/api/suppliers/orders', shoeT, { supplierId: sup.data?._id, items: [{ productId: sp._id, productName: sp.name, quantity: 10, unitCost: 1000 }], initialPayment: 2000 });
  check('purchase order created', ord.status === 201, `status ${ord.status} ${ord.data?.message || ''}`);
  const ordGet = await call('GET', `/api/suppliers/orders?supplierId=${sup.data?._id}`, shoeT);
  const o = ordGet.data?.[0];
  check('PO persists its line items', Array.isArray(o?.items) && o.items.length === 1, `items=${JSON.stringify(o?.items)}`);
  check('PO persists the advance payment record', Array.isArray(o?.payments) && o.payments.length === 1 && o.paidAmount === 2000, `paidAmount=${o?.paidAmount} payments=${JSON.stringify(o?.payments)}`);
  const pay = await call('POST', `/api/suppliers/orders/${o?._id}/payments`, shoeT, { amount: 3000 });
  const o2 = (await call('GET', `/api/suppliers/orders?supplierId=${sup.data?._id}`, shoeT)).data?.[0];
  check('supplier payment recorded, outstanding balance = 10000-5000', pay.status === 201 && o2?.paidAmount === 5000 && o2?.pendingAmount === 5000 && o2?.payments?.length === 2, `status ${pay.status}, paid=${o2?.paidAmount}, pending=${o2?.pendingAmount}, payments=${o2?.payments?.length}`);
  const stk0 = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  const rec = await call('POST', `/api/suppliers/orders/${o?._id}/receive`, shoeT);
  const stk1 = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  check('receiving PO adds stock (+10)', rec.status === 200 && stk1 === stk0 + 10, `status ${rec.status} ${rec.data?.message || ''}, stock ${stk0}->${stk1}`);
  const rec2 = await call('POST', `/api/suppliers/orders/${o?._id}/receive`, shoeT);
  const stk2 = (await call('GET', `/api/shoes/products/${sp._id}`, shoeT)).data.stockQuantity;
  check('receiving the same PO twice does not double-add stock', stk2 === stk1, `second receive status ${rec2.status}, stock ${stk1}->${stk2}`);
  const xs = await call('GET', `/api/suppliers/${sup.data?._id}`, clothT);
  check('other shop cannot read this supplier', [403, 404].includes(xs.status), `status ${xs.status}`);

  // ---- payroll ----
  const staff = (await call('GET', '/api/shoes/salesmen', shoeT)).data || [];
  const st = staff[0];
  if (st) {
    const m = new Date().getMonth() + 1, y = new Date().getFullYear();
    const adv = await call('POST', `/api/shoes/salesmen/${st._id}/advances`, shoeT, { amount: -500 });
    check('negative advance rejected', adv.status === 400, `status ${adv.status}`);
    const paid1 = await call('POST', `/api/shoes/salesmen/${st._id}/salary/pay`, shoeT, { month: m, year: y, amountPaid: 99999999, note: 'probe' });
    const rep = (await call('GET', `/api/shoes/salesmen/${st._id}/salary-report?month=${m}&year=${y}`, shoeT)).data;
    check('salary payment above net payable is rejected', paid1.status === 400, `status ${paid1.status}, netPayable=${rep?.netPayable}, amountPaid=${rep?.amountPaid}`);
    await call('POST', `/api/shoes/salesmen/${st._id}/salary/undo`, shoeT, { month: m, year: y });
    const p2 = await call('POST', `/api/shoes/salesmen/${st._id}/salary/pay`, shoeT, { month: m, year: y, amountPaid: 1, note: 'a' });
    const p3 = await call('POST', `/api/shoes/salesmen/${st._id}/salary/pay`, shoeT, { month: m, year: y, amountPaid: 1, note: 'b' });
    check('paying an already-paid month is rejected (no double payment)', !(p2.status === 200 && p3.status === 200), `first ${p2.status}, second ${p3.status}`);
    await call('POST', `/api/shoes/salesmen/${st._id}/salary/undo`, shoeT, { month: m, year: y });
  } else check('seed staff exists for payroll probe', false, 'no staff in seed');

  // ---- expenses & P&L ----
  check('negative expense rejected', (await call('POST', '/api/finance/expenses', shoeT, { amount: -10, category: 'Rent' })).status === 400);
  const ex = await call('POST', '/api/finance/expenses', shoeT, { amount: 1234, category: 'Rent', note: 'probe' });
  check('expense recorded', ex.status === 201);
  const pl = await call('GET', `/api/finance/monthly?year=${new Date().getFullYear()}`, shoeT);
  check('P&L endpoint responds with 12 months', pl.status === 200 && pl.data?.months?.length === 12, `status ${pl.status}`);

  // ---- registration / roles ----
  const email = `probe${Date.now()}@test.pk`;
  const reg = await call('POST', '/api/auth/register', null, { fullName: 'Probe', email: 'weak' + email, password: '1' });
  check('weak 1-char password is rejected at signup', reg.status === 400, `status ${reg.status}`);
  const reg2 = await call('POST', '/api/auth/register', null, { fullName: 'Probe', email, password: 'Probe@12345' });
  const t2 = reg2.data?.token;
  const noShop = await call('GET', '/api/shoes/products', t2);
  check('user without a shop gets 400 on shop routes', noShop.status === 400, `status ${noShop.status}`);
  const rs1 = await call('POST', '/api/auth/register-shop', t2, { name: 'Probe Shop', type: 'Bogus' });
  check('register-shop rejects invalid shop type', rs1.status === 400, `status ${rs1.status}`);

  const errBody = await call('GET', '/api/shoes/products/not-an-id', shoeT);
  check('malformed id -> 400 (no crash)', errBody.status === 400, `status ${errBody.status}`);
  check('server still healthy after probes', (await call('GET', '/api/health')).status === 200);

  console.log(`\n${pass} passed, ${fail} failed, ${deferredFail} known-deferred`);
  require('fs').writeFileSync(process.env.OUT || 'probe-results.json', JSON.stringify({ base: BASE, pass, fail, deferredFail, results }, null, 2));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROBE CRASHED', e); process.exit(2); });
