// Small, dependency-free input validation helpers shared by sale / purchase flows.
// Every helper throws an Error with a user-readable message; controllers translate that into HTTP 400.
const mongoose = require('mongoose');

const MAX_LINES = 200;
const MAX_QTY = 100000;

const isId = (v) => mongoose.isValidObjectId(v) && String(v).length === 24;
const { round2 } = require('./money'); // single money-rounding implementation (see utils/money.js)

function positiveInt(v, label) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0 || n > MAX_QTY) throw new Error(`${label} must be a whole number between 1 and ${MAX_QTY}.`);
  return n;
}

function money(v, label, { min = 0, allowZero = true } = {}) {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || !Number.isFinite(n)) throw new Error(`${label} must be a number.`);
  if (n < min || (!allowZero && n === 0)) throw new Error(`${label} must be ${allowZero ? 'zero or more' : 'greater than zero'}.`);
  return round2(n);
}

const text = (v, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));

// Validates & normalises cart lines. Prices come from the client for now (server-side price
// authority is planned for the POS session); quantities and prices are at least sane.
function normalizeSaleLines(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Cart is empty.');
  if (raw.length > MAX_LINES) throw new Error(`Too many line items (max ${MAX_LINES}).`);
  return raw.map((l, i) => {
    const n = i + 1;
    if (!l || !isId(l.productId)) throw new Error(`Line ${n}: invalid product.`);
    return {
      productId: String(l.productId),
      productName: text(l.productName),
      size: text(l.size, 20),
      color: text(l.color, 50),
      sku: text(l.sku, 50),
      quantity: positiveInt(l.quantity, `Line ${n}: quantity`),
      unitPrice: money(l.unitPrice, `Line ${n}: unit price`, { allowZero: false }),
    };
  });
}

function normalizeDiscount(v, subTotal) {
  const d = money(v === undefined || v === null || v === '' ? 0 : v, 'Discount');
  if (d > subTotal) throw new Error('Discount cannot exceed the sub-total.');
  return d;
}

module.exports = { isId, round2, positiveInt, money, text, normalizeSaleLines, normalizeDiscount };
