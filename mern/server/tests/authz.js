/* Session 2 integration tests: roles x endpoints, password policy, lockout, token revocation, user management, audit log.
 * Usage: BASE=http://localhost:5000 node tests/authz.js        (needs a running, SEEDED server; uses the seeded demo owners)
 * Optional: BASE_PROD=http://localhost:5056  -> a 2nd server started with NODE_ENV=production AUTH_RATE_MAX=5 (signup policy + rate limit checks).
 * It creates staff users and audit rows in the seeded shops: use a throw-away database. */
const BASE = process.env.BASE || 'http://localhost:5000';
const BASE_PROD = process.env.BASE_PROD || '';
let pass = 0, fail = 0; const results = [];
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };

async function call(method, path, token, body, base = BASE) {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch { /* empty */ }
  return { status: r.status, data };
}
const login = async (email, password) => call('POST', '/api/auth/login', null, { email, password });
const FAKE = '000000000000000000000001';
// Handlers that use aggregation operators the FerretDB stand-in lacks ($multiply in $group). Authorization is still checked (not 403),
// but a 500 from them is tolerated ONLY when not running with REAL_MONGO=1 and is reported as unverified.
const STANDIN_500 = process.env.REAL_MONGO === '1' ? [] : ['/api/shoes/sales/dashboard-stats'];
let standin500 = 0;
const TEMP = 'Temp-Pass-2026a', NEW = 'Fresh-Pass-2026b';
const stamp = Date.now();

(async () => {
  const O = (await login('admin@stepup.pk', 'Admin@123')).data.token;      // Shoes owner
  const CO = (await login('admin@stylehub.pk', 'Admin@123')).data.token;   // Clothes owner
  check('owners can log in', !!O && !!CO);
  const me = (await call('GET', '/api/auth/me', O)).data;
  check('/me returns role=Owner and the permission list', me.user.role === 'Owner' && me.user.permissions.includes('users.manage') && me.user.permissions.length >= 20);

  // ---------- create one user per role (shoes shop) via the Owner API ----------
  const tok = {}; const ids = {};
  for (const role of ['Manager', 'Cashier', 'StockManager', 'Accountant']) {
    const email = `${role.toLowerCase()}.${stamp}@stepup.pk`;
    const c = await call('POST', '/api/users', O, { fullName: `${role} Test`, email, role, password: TEMP });
    check(`Owner creates a ${role}`, c.status === 201 && c.data.role === role && c.data.mustChangePassword === true, `status ${c.status} ${c.data?.message || ''}`);
    ids[role] = c.data?.id;
    const l = await login(email, TEMP);
    if (role === 'Manager') {
      const blocked = await call('GET', '/api/shoes/products', l.data.token);
      check('new staff must change the temporary password first (403 PASSWORD_CHANGE_REQUIRED)', blocked.status === 403 && blocked.data?.code === 'PASSWORD_CHANGE_REQUIRED', `status ${blocked.status} ${blocked.data?.code}`);
    }
    const ch = await call('POST', '/api/auth/change-password', l.data.token, { currentPassword: TEMP, newPassword: NEW });
    tok[role] = ch.data?.token; tok[role + 'Email'] = email;
    check(`${role} can change password and gets a working token`, ch.status === 200 && (await call('GET', '/api/auth/me', ch.data.token)).status === 200);
  }
  tok.Owner = O;

  // ---------- role x endpoint matrix (shoes shop) ----------
  // allowed = roles expected NOT to get 403. Calls use a fake id / empty body so nothing is changed. An allowed call must not 5xx.
  const R = { O: 'Owner', M: 'Manager', C: 'Cashier', S: 'StockManager', A: 'Accountant' };
  const M = [
    ['GET', '/api/shoes/products', undefined, 'OMCSA'],
    ['GET', '/api/shoes/products/low-stock', undefined, 'OMCSA'],
    ['GET', '/api/shoes/products/stats', undefined, 'OMA'],
    ['POST', '/api/shoes/products', {}, 'OMS'],
    ['PUT', `/api/shoes/products/${FAKE}`, {}, 'OMS'],
    ['DELETE', `/api/shoes/products/${FAKE}`, undefined, 'OM'],
    ['PATCH', `/api/shoes/products/${FAKE}/stock`, { quantity: 1 }, 'OMS'],
    ['GET', '/api/shoes/sales', undefined, 'OMCA'],
    ['GET', '/api/shoes/sales/dashboard-stats', undefined, 'OMA'],
    ['POST', '/api/shoes/sales', {}, 'OMC'],
    ['POST', `/api/shoes/sales/${FAKE}/refund`, undefined, 'OM'],
    ['GET', '/api/shoes/salesmen', undefined, 'OMA'],
    ['GET', '/api/shoes/salesmen/active', undefined, 'OMCA'],
    ['GET', '/api/shoes/salesmen/salary-reports', undefined, 'OMA'],
    ['POST', '/api/shoes/salesmen', {}, 'OM'],
    ['DELETE', `/api/shoes/salesmen/${FAKE}`, undefined, 'OM'],
    ['POST', `/api/shoes/salesmen/${FAKE}/attendance`, {}, 'OM'],
    ['POST', `/api/shoes/salesmen/${FAKE}/salary/pay`, {}, 'OA'],
    ['POST', `/api/shoes/salesmen/${FAKE}/salary/undo`, {}, 'OA'],
    ['POST', `/api/shoes/salesmen/${FAKE}/advances`, {}, 'OA'],
    ['GET', '/api/finance/monthly', undefined, 'OMA'],
    ['GET', '/api/finance/forecast', undefined, 'OMA'],
    ['GET', '/api/finance/expenses', undefined, 'OMA'],
    ['POST', '/api/finance/expenses', {}, 'OMA'],
    ['DELETE', `/api/finance/expenses/${FAKE}`, undefined, 'OMA'],
    ['GET', '/api/suppliers', undefined, 'OMSA'],
    ['POST', '/api/suppliers', {}, 'OMS'],
    ['DELETE', `/api/suppliers/${FAKE}`, undefined, 'OMS'],
    ['POST', '/api/suppliers/orders', {}, 'OMS'],
    ['POST', `/api/suppliers/orders/${FAKE}/receive`, undefined, 'OMS'],
    ['POST', `/api/suppliers/orders/${FAKE}/payments`, { amount: 1 }, 'OMA'],
    ['POST', `/api/suppliers/orders/${FAKE}/cancel`, undefined, 'OMS'],
    ['GET', '/api/shop/current', undefined, 'OMCSA'],
    ['PUT', '/api/shop/current', {}, 'O'],
    ['GET', '/api/users', undefined, 'O'],
    ['POST', '/api/users', {}, 'O'],
    ['PATCH', `/api/users/${FAKE}`, {}, 'O'],
    ['POST', `/api/users/${FAKE}/reset-password`, {}, 'O'],
    ['GET', '/api/audit-logs', undefined, 'OMA'],
  ];
  let matrixBad = []; let cells = 0;
  for (const [method, path, body, allowed] of M) {
    for (const [letter, role] of Object.entries(R)) {
      const r = await call(method, path, tok[role], body); cells++;
      const shouldAllow = allowed.includes(letter);
      const tolerated = shouldAllow && r.status >= 500 && STANDIN_500.includes(path);
      if (tolerated) standin500++;
      const ok = tolerated || (shouldAllow ? (r.status !== 403 && r.status !== 401 && r.status < 500) : r.status === 403);
      if (!ok) matrixBad.push(`${role} ${method} ${path} -> ${r.status} (expected ${shouldAllow ? 'allowed' : '403'})`);
    }
  }
  check(`role x endpoint matrix: ${M.length} endpoints x 5 roles = ${cells} cells all correct`, matrixBad.length === 0, matrixBad.length ? matrixBad.slice(0, 8).join(' | ') : (standin500 ? `${standin500} cells hit a stand-in-only 500 (handler needs real MongoDB; authorization itself passed)` : ''));
  const noTok = []; for (const [method, path, body] of M) { const r = await call(method, path, null, body); if (r.status !== 401) noTok.push(`${method} ${path} -> ${r.status}`); }
  check('every matrix endpoint returns 401 without a token', noTok.length === 0, noTok.slice(0, 5).join(' | '));

  // ---------- clothes vertical spot checks ----------
  const cc = await call('POST', '/api/users', CO, { fullName: 'Clothes Cashier', email: `cc.${stamp}@stylehub.pk`, role: 'Cashier', password: TEMP });
  const cl = await login(`cc.${stamp}@stylehub.pk`, TEMP); const cch = await call('POST', '/api/auth/change-password', cl.data.token, { currentPassword: TEMP, newPassword: NEW });
  const CC = cch.data?.token;
  const s = async (m, p, t, b) => (await call(m, p, t, b)).status;
  check('clothes Cashier: products 200, sales view 200, POS salesmen/active 200', (await s('GET', '/api/clothes/products', CC)) === 200 && (await s('GET', '/api/clothes/sales', CC)) === 200 && (await s('GET', '/api/clothes/salesmen/active', CC)) === 200);
  check('clothes Cashier: delete product / refund / staff list / stats / payroll -> 403', (await s('DELETE', `/api/clothes/products/${FAKE}`, CC)) === 403 && (await s('POST', `/api/clothes/sales/${FAKE}/refund`, CC)) === 403 && (await s('GET', '/api/clothes/salesmen', CC)) === 403 && (await s('GET', '/api/clothes/sales/stats', CC)) === 403 && (await s('GET', '/api/clothes/salesmen/salary-reports', CC)) === 403);
  check('shoes Manager token is rejected on /api/clothes/* (shop-type isolation still holds)', (await s('GET', '/api/clothes/products', tok.Manager)) === 403);

  // ---------- user-management guards ----------
  const mk = await call('POST', '/api/users', O, { fullName: 'X', email: `owner2.${stamp}@x.pk`, role: 'Owner', password: TEMP });
  check('Owner role cannot be assigned through the API', mk.status === 400, `status ${mk.status}`);
  check('weak temp password rejected when creating a user', (await call('POST', '/api/users', O, { fullName: 'X', email: `w.${stamp}@x.pk`, role: 'Cashier', password: 'abc' })).status === 400);
  check('duplicate email -> 409', (await call('POST', '/api/users', O, { fullName: 'X', email: tok.CashierEmail, role: 'Cashier', password: TEMP })).status === 409);
  const meId = me.user.id;
  check('Owner cannot disable own account', (await call('PATCH', `/api/users/${meId}`, O, { isActive: false })).status === 400);
  check('Owner role cannot be changed', (await call('PATCH', `/api/users/${meId}`, O, { role: 'Cashier' })).status === 400);
  check('other shop cannot see / edit this shop\'s users', (await call('PATCH', `/api/users/${ids.Cashier}`, CO, { role: 'Manager' })).status === 404);
  const list = (await call('GET', '/api/users', O)).data;
  check('user list only contains this shop\'s users (no clothes emails)', Array.isArray(list) && list.length >= 5 && !list.some((u) => /stylehub|cc\./.test(u.email)) && !list.some((u) => u.passwordHash));

  // ---------- token revocation ----------
  const cashierOld = tok.Cashier;
  const roleChange = await call('PATCH', `/api/users/${ids.Cashier}`, O, { role: 'StockManager' });
  const afterRole = await call('GET', '/api/auth/me', cashierOld);
  check('changing a user\'s role revokes their old token (TOKEN_REVOKED)', roleChange.status === 200 && afterRole.status === 401 && afterRole.data?.code === 'TOKEN_REVOKED', `role ${roleChange.status}, old token ${afterRole.status} ${afterRole.data?.code}`);
  const reCash = (await login(tok.CashierEmail, NEW)).data.token;
  check('new login shows the new role\'s permissions', (await call('GET', '/api/suppliers', reCash)).status === 200);
  await call('PATCH', `/api/users/${ids.Cashier}`, O, { role: 'Cashier' });

  const dis = await call('PATCH', `/api/users/${ids.Accountant}`, O, { isActive: false });
  check('disabling a user kills their session immediately', dis.status === 200 && (await call('GET', '/api/auth/me', tok.Accountant)).status === 401);
  const disLogin = await login(tok.AccountantEmail, NEW);
  check('a disabled user cannot log in (403 ACCOUNT_DISABLED)', disLogin.status === 403 && disLogin.data?.code === 'ACCOUNT_DISABLED', `status ${disLogin.status}`);
  await call('PATCH', `/api/users/${ids.Accountant}`, O, { isActive: true });

  const lo = await login(tok.StockManagerEmail, NEW); const loTok = lo.data.token;
  check('logout revokes the token', (await call('POST', '/api/auth/logout', loTok)).status === 200 && (await call('GET', '/api/auth/me', loTok)).status === 401);

  const mTok = (await login(tok.ManagerEmail, NEW)).data.token;
  const pw1 = await call('POST', '/api/auth/change-password', mTok, { currentPassword: 'wrong-pass-1', newPassword: 'Another-Pass-2026c' });
  check('change-password with wrong current password -> 400', pw1.status === 400);
  const pw2 = await call('POST', '/api/auth/change-password', mTok, { currentPassword: NEW, newPassword: 'short' });
  check('change-password enforces the password policy', pw2.status === 400);
  const pw3 = await call('POST', '/api/auth/change-password', mTok, { currentPassword: NEW, newPassword: 'Another-Pass-2026c' });
  check('after a password change the OLD token is revoked and the NEW token works', pw3.status === 200 && (await call('GET', '/api/auth/me', mTok)).status === 401 && (await call('GET', '/api/auth/me', pw3.data.token)).status === 200);
  const rf = await call('POST', '/api/auth/refresh', pw3.data.token);
  check('refresh issues a fresh working token', rf.status === 200 && !!rf.data.token && (await call('GET', '/api/auth/me', rf.data.token)).status === 200);
  const rs = await call('POST', `/api/users/${ids.Manager}/reset-password`, O, { newPassword: TEMP });
  check('Owner reset-password ends the user\'s sessions and forces a change', rs.status === 200 && (await call('GET', '/api/auth/me', rf.data.token)).status === 401 && rs.data.mustChangePassword === true);

  // ---------- lockout ----------
  const victim = tok.CashierEmail; let last;
  for (let i = 0; i < 5; i++) last = await login(victim, 'Wrong-Pass-999');
  const locked = await login(victim, NEW);
  check('5 wrong passwords lock the account (423) even for the correct password', locked.status === 423 && locked.data?.code === 'ACCOUNT_LOCKED', `5th wrong=${last.status}, correct-after=${locked.status}`);
  check('Owner can unlock the account', (await call('POST', `/api/users/${ids.Cashier}/unlock`, O)).status === 200 && (await login(victim, NEW)).status === 200);

  // ---------- registration / password policy ----------
  const weak = ['Ab1', 'abcdefghij', '1234567890', 'Password123'];
  let weakOk = true; for (const w of weak) { const r = await call('POST', '/api/auth/register', null, { fullName: 'W', email: `w${Math.random().toString(36).slice(2)}@t.pk`, password: w }); if (r.status !== 400) weakOk = false; }
  check('register rejects short / no-digit / no-letter / common passwords', weakOk);
  check('register rejects an invalid email', (await call('POST', '/api/auth/register', null, { fullName: 'W', email: 'not-an-email', password: 'Good-Pass-2026' })).status === 400);
  const rg = await call('POST', '/api/auth/register', null, { fullName: 'Self Signup', email: `self${stamp}@t.pk`, password: 'Good-Pass-2026' });
  check('self sign-up creates an Owner with NO shop and no access to shop data (dev mode)', rg.status === 200 && rg.data.user.role === 'Owner' && (await call('GET', '/api/shoes/products', rg.data.token)).status === 400);
  if (BASE_PROD) {
    const p = await call('POST', '/api/auth/register', null, { fullName: 'Prod Signup', email: `prod${stamp}@t.pk`, password: 'Good-Pass-2026' }, BASE_PROD);
    check('PRODUCTION: public sign-up is disabled once users exist (403 SIGNUP_DISABLED)', p.status === 403 && p.data?.code === 'SIGNUP_DISABLED', `status ${p.status}`);
    let got429 = false; for (let i = 0; i < 9; i++) { const r = await call('POST', '/api/auth/login', null, { email: 'nobody@x.pk', password: 'x' }, BASE_PROD); if (r.status === 429) { got429 = true; break; } }
    check('login endpoint is rate-limited per IP (429 after AUTH_RATE_MAX attempts)', got429);
    const hdr = await fetch(BASE_PROD + '/api/health'); 
    check('helmet security headers present (nosniff, frame, no x-powered-by)', hdr.headers.get('x-content-type-options') === 'nosniff' && !!hdr.headers.get('x-frame-options') && !hdr.headers.get('x-powered-by'));
  }

  // ---------- audit log ----------
  await call('DELETE', `/api/shoes/products/${FAKE}`, O);
  const logs = (await call('GET', '/api/audit-logs?limit=200', O)).data;
  const acts = new Set((logs.items || []).map((l) => l.action));
  check('audit log recorded login, user.create, user.update, password change, logout, forbidden attempts, product.delete', ['auth.login', 'user.create', 'user.update', 'auth.password_change', 'auth.logout', 'auth.forbidden', 'product.delete', 'auth.login_locked', 'user.reset_password'].every((a) => acts.has(a)), `missing: ${['auth.login', 'user.create', 'user.update', 'auth.password_change', 'auth.logout', 'auth.forbidden', 'product.delete', 'auth.login_locked', 'user.reset_password'].filter((a) => !acts.has(a)).join(',') || 'none'}`);
  const blob = JSON.stringify(logs);
  check('audit log never contains passwords or tokens', !blob.includes(TEMP) && !blob.includes(NEW) && !blob.includes('Another-Pass') && !/eyJ[A-Za-z0-9_-]{20,}/.test(blob));
  check('audit log is shop-scoped (clothes owner sees none of the shoes entries)', !((await call('GET', '/api/audit-logs?limit=200', CO)).data.items || []).some((l) => /stepup/.test(l.userEmail)));
  const cashNow = (await login(tok.CashierEmail, NEW)).data.token;
  check('Cashier cannot read the audit log', (await call('GET', '/api/audit-logs', cashNow)).status === 403);

  console.log(`\n${pass} passed, ${fail} failed`);
  require('fs').writeFileSync(process.env.OUT || 'authz-results.json', JSON.stringify({ base: BASE, pass, fail, results }, null, 2));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('AUTHZ TEST CRASHED', e); process.exit(2); });
