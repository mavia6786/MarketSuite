// Pure unit tests (no server / DB needed): npm run test:unit
const assert = require('assert');
const money = require('../utils/money');
const { validatePassword } = require('../utils/password');
const P = require('../config/permissions');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS  ' + name); };

t('money.add avoids float drift (0.1 + 0.2 = 0.3)', () => assert.strictEqual(money.add(0.1, 0.2), 0.3));
t('money.sum of 10 x 0.1 = 1', () => assert.strictEqual(money.sum(Array(10).fill(0.1)), 1));
t('money.mul(19.99, 3) = 59.97', () => assert.strictEqual(money.mul(19.99, 3), 59.97));
t('money.pct(1000, 17) = 170', () => assert.strictEqual(money.pct(1000, 17), 170));
t('money.pct rounds half-up to paisa: pct(0.05, 50) = 0.03', () => assert.strictEqual(money.pct(0.05, 50), 0.03));
t('money.round2(1.005) = 1.01 (epsilon-safe)', () => assert.strictEqual(money.round2(1.005), 1.01));
t('money.sub(10, 9.99) = 0.01', () => assert.strictEqual(money.sub(10, 9.99), 0.01));
t('money.isMoney rejects 3 decimals / NaN', () => { assert(!money.isMoney(1.234)); assert(!money.isMoney(NaN)); assert(money.isMoney(1.23)); });

t('password: too short rejected', () => assert(validatePassword('Ab1')));
t('password: no digit rejected', () => assert(validatePassword('abcdefghij')));
t('password: no letter rejected', () => assert(validatePassword('1234567890')));
t('password: common rejected', () => assert(validatePassword('Password123')));
t('password: contains email name rejected', () => assert(validatePassword('ahmedkhan99x', { email: 'ahmedkhan@x.pk' })));
t('password: good one accepted', () => assert.strictEqual(validatePassword('Gul-Bahar-2026'), null));

t('permissions: every role permission exists in PERMISSIONS', () => P.ROLES.forEach((r) => P.ROLE_PERMISSIONS[r].forEach((p) => assert(P.PERMISSIONS.includes(p), `${r}:${p}`))));
t('permissions: Owner has everything', () => assert.deepStrictEqual([...P.ROLE_PERMISSIONS.Owner].sort(), [...P.PERMISSIONS].sort()));
t('permissions: only Owner can manage users / edit shop', () => P.ROLES.filter((r) => r !== 'Owner').forEach((r) => { assert(!P.hasPermission(r, 'users.manage')); assert(!P.hasPermission(r, 'shop.edit')); }));
t('permissions: Cashier cannot refund / delete / see payroll / finance', () => ['sales.refund', 'products.delete', 'payroll.view', 'finance.view', 'stock.adjust'].forEach((p) => assert(!P.hasPermission('Cashier', p), p)));
t('permissions: unknown/legacy role gets least privilege (Cashier)', () => { assert.strictEqual(P.normalizeRole('Staff'), 'Cashier'); assert(!P.hasPermission('Staff', 'sales.refund')); });
t('permissions: Owner is not assignable via API', () => assert(!P.ASSIGNABLE_ROLES.includes('Owner')));
console.log(`\n${n} unit checks passed`);
