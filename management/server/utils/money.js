// Money policy (decision recorded in ARCHITECTURE.md §Money):
//  * Amounts are stored as JS Numbers with exactly 2 decimals (PKR rupees.paisa) — no schema migration.
//  * ALL arithmetic goes through these helpers, which compute in INTEGER paisa so 0.1 + 0.2 style drift
//    can never accumulate, and always round half-up at the boundary.
//  * Never add/multiply money with raw `+` / `*` in new code; use add(), sub(), mul(), pct(), sum().
const toMinor = (v) => Math.round((Number(v) + Number.EPSILON) * 100);
const fromMinor = (m) => Math.round(m) / 100;
const round2 = (v) => fromMinor(toMinor(v));

const add = (...vals) => fromMinor(vals.reduce((s, v) => s + toMinor(v), 0));
const sub = (a, b) => fromMinor(toMinor(a) - toMinor(b));
const sum = (arr, pick = (x) => x) => fromMinor(arr.reduce((s, x) => s + toMinor(pick(x)), 0));
// amount x quantity (quantity may be fractional only for weight-based goods; today always whole)
const mul = (amount, qty) => fromMinor(Math.round(toMinor(amount) * Number(qty)));
// percentage of an amount, e.g. pct(1000, 17) -> 170
const pct = (amount, percent) => fromMinor(Math.round((toMinor(amount) * Number(percent)) / 100));
const isMoney = (v) => typeof v === 'number' && Number.isFinite(v) && toMinor(v) / 100 === v;

module.exports = { toMinor, fromMinor, round2, add, sub, sum, mul, pct, isMoney };
