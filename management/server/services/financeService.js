const Expense = require('../models/Expense');
const SupplierOrder = require('../models/SupplierOrder');
const ShoeSale = require('../models/shoes/Sale');
const ShoeProduct = require('../models/shoes/Product');
const ClothingSale = require('../models/clothes/ClothingSale');
const ClothingProduct = require('../models/clothes/ClothingProduct');
const shoeStaff = require('./shoes/salesmanService');
const clothesStaff = require('./clothes/clothingSalesmanService');
const { monthRange, localParts, daysInMonth, toDay } = require('../utils/dates');

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round = (n) => Math.round(n || 0);
// NOTE: passes the index too (the forecast's weighted average relies on it)
const sum = (arr, f) => arr.reduce((s, x, i) => s + f(x, i), 0);

const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Utilities', 'Transport', 'Marketing', 'Maintenance', 'Packaging', 'Tax', 'Misc'];

// The two verticals store sales slightly differently — hide that here.
const ADAPTERS = {
  Shoes: { Sale: ShoeSale, Product: ShoeProduct, total: (s) => s.total, staff: shoeStaff },
  Clothes: { Sale: ClothingSale, Product: ClothingProduct, total: (s) => s.totalAmount, staff: clothesStaff },
};
const adapterFor = (shop) => (shop.type === 'Clothes' ? ADAPTERS.Clothes : ADAPTERS.Shoes);

const ymKey = (y, m) => y * 12 + (m - 1);
const fromKey = (k) => ({ year: Math.floor(k / 12), month: (k % 12) + 1 });

// ── helpers ─────────────────────────────────────────────────────────────────
function saleCost(sale, costMap, flags) {
  let cost = 0;
  for (const it of sale.items || []) {
    let unit = it.unitCost || 0;
    if (!unit && it.productId) unit = costMap.get(String(it.productId)) || 0; // older sales: use current product cost
    if (!unit) flags.missing += 1;
    cost += unit * (it.quantity || 0);
  }
  return cost;
}

async function firstActivityKey(shop, A) {
  const [s, e] = await Promise.all([
    A.Sale.findOne({ shopId: shop._id }).sort({ saleDate: 1 }).lean(),
    Expense.findOne({ shopId: shop._id }).sort({ date: 1 }).lean(),
  ]);
  const dates = [s?.saleDate, e?.date].filter(Boolean).map((d) => new Date(d));
  if (!dates.length) return null;
  const first = localParts(new Date(Math.min(...dates)));
  return ymKey(first.year, first.month);
}

// ── Monthly profit & loss for one year ──────────────────────────────────────
exports.getMonthly = async (shop, year) => {
  const A = adapterFor(shop);
  const shopId = shop._id;
  const yStart = monthRange(year, 1).start;
  const yEnd = monthRange(year, 12).end;
  const now = localParts(new Date());
  const nowKey = ymKey(now.year, now.month);
  const firstKey = await firstActivityKey(shop, A);

  const [sales, products, expenses, orders] = await Promise.all([
    A.Sale.find({ shopId, status: 'Completed', saleDate: { $gte: yStart, $lt: yEnd } }).lean(),
    A.Product.find({ shopId }).lean(),
    Expense.find({ shopId, date: { $gte: yStart, $lt: yEnd } }).lean(),
    SupplierOrder.find({ shopId, status: { $ne: 'Cancelled' } }).lean(),
  ]);
  const costMap = new Map(products.map((p) => [String(p._id), p.costPrice || 0]));

  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const k = ymKey(year, m);
    const { start, end } = monthRange(year, m);
    const isFuture = k > nowKey;
    const tracked = firstKey !== null && k >= firstKey && !isFuture;

    const ms = sales.filter((s) => s.saleDate >= start && s.saleDate < end);
    const flags = { missing: 0 };
    const revenue = sum(ms, A.total);
    const cogs = sum(ms, (s) => saleCost(s, costMap, flags));
    const me = expenses.filter((e) => e.date >= start && e.date < end);
    const expenseTotal = sum(me, (e) => e.amount);
    const byCat = {};
    me.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

    const payroll = tracked ? await A.staff.payrollCost(shopId, m, year) : { salary: 0, bonus: 0, estimated: false };
    const salaries = payroll.salary + payroll.bonus;

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - salaries - expenseTotal;
    const hasData = tracked && (ms.length > 0 || expenseTotal > 0 || salaries > 0);

    rows.push({
      year, month: m, label: MONTH_LABELS[m - 1], isFuture, isCurrent: k === nowKey,
      orders: ms.length, revenue: round(revenue), cogs: round(cogs), grossProfit: round(grossProfit),
      grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
      salaries: round(salaries), salaryEstimated: payroll.estimated,
      expenses: round(expenseTotal), expenseByCategory: byCat,
      netProfit: round(netProfit),
      status: !hasData ? 'No data' : netProfit >= 0 ? 'Profit' : 'Loss',
      supplierPurchases: round(sum(orders.filter((o) => o.orderDate >= start && o.orderDate < end), (o) => o.totalAmount)),
      supplierPaid: round(sum(orders, (o) => sum((o.payments || []).filter((p) => p.date >= start && p.date < end), (p) => p.amount))),
      itemsMissingCost: flags.missing,
    });
  }

  const real = rows.filter((r) => r.status !== 'No data');
  const totals = {
    revenue: sum(real, (r) => r.revenue), cogs: sum(real, (r) => r.cogs), grossProfit: sum(real, (r) => r.grossProfit),
    salaries: sum(real, (r) => r.salaries), expenses: sum(real, (r) => r.expenses), netProfit: sum(real, (r) => r.netProfit),
    orders: sum(real, (r) => r.orders),
    profitMonths: real.filter((r) => r.status === 'Profit').length,
    lossMonths: real.filter((r) => r.status === 'Loss').length,
    bestMonth: real.length ? real.reduce((a, b) => (b.netProfit > a.netProfit ? b : a)).label : null,
    worstMonth: real.length ? real.reduce((a, b) => (b.netProfit < a.netProfit ? b : a)).label : null,
    itemsMissingCost: sum(real, (r) => r.itemsMissingCost),
  };
  return { year, months: rows, totals };
};

// ── One month in detail (what sold best, payment mix, expenses) ─────────────
exports.getMonthDetail = async (shop, year, month) => {
  const A = adapterFor(shop);
  const shopId = shop._id;
  const { start, end } = monthRange(year, month);
  const [sales, products, expenses] = await Promise.all([
    A.Sale.find({ shopId, status: 'Completed', saleDate: { $gte: start, $lt: end } }).lean(),
    A.Product.find({ shopId }).lean(),
    Expense.find({ shopId, date: { $gte: start, $lt: end } }).sort({ date: -1 }).lean(),
  ]);
  const costMap = new Map(products.map((p) => [String(p._id), p.costPrice || 0]));

  const byProduct = new Map();
  const payMix = {};
  for (const s of sales) {
    payMix[s.paymentMethod] = (payMix[s.paymentMethod] || 0) + A.total(s);
    for (const it of s.items || []) {
      const unitCost = it.unitCost || costMap.get(String(it.productId)) || 0;
      const key = it.productName;
      const row = byProduct.get(key) || { name: key, units: 0, revenue: 0, profit: 0 };
      const lineRev = it.lineTotal != null && it.lineTotal > 0 ? it.lineTotal : it.unitPrice * it.quantity;
      row.units += it.quantity;
      row.revenue += lineRev;
      row.profit += lineRev - unitCost * it.quantity;
      byProduct.set(key, row);
    }
  }
  const top = [...byProduct.values()].sort((a, b) => b.profit - a.profit).slice(0, 8).map((r) => ({ ...r, revenue: round(r.revenue), profit: round(r.profit) }));
  return { top, payMix, expenses };
};

// ── Forecast ────────────────────────────────────────────────────────────────
function linearFit(ys) {
  const n = ys.length;
  const xs = ys.map((_, i) => i);
  const mx = sum(xs, (x) => x) / n;
  const my = sum(ys, (y) => y) / n;
  const den = sum(xs, (x) => (x - mx) ** 2) || 1;
  const slope = sum(xs, (x) => (x - mx) * (ys[x] - my)) / den;
  const intercept = my - slope * mx;
  const resid = ys.map((y, i) => y - (intercept + slope * i));
  const sd = Math.sqrt(sum(resid, (r) => r * r) / Math.max(1, n - 2));
  return { slope, intercept, sd };
}

exports.getForecast = async (shop, horizon = 3) => {
  const A = adapterFor(shop);
  const now = localParts(new Date());
  const nowKey = ymKey(now.year, now.month);

  // history = this year + last year, chronological
  const [cur, prev] = await Promise.all([exports.getMonthly(shop, now.year), exports.getMonthly(shop, now.year - 1)]);
  const all = [...prev.months, ...cur.months].filter((r) => ymKey(r.year, r.month) <= nowKey && r.status !== 'No data');
  const currentRow = all.find((r) => r.isCurrent) || null;
  const completed = all.filter((r) => !r.isCurrent).slice(-6);

  const out = {
    history: [...completed, ...(currentRow ? [currentRow] : [])],
    basedOnMonths: completed.length,
    confidence: completed.length >= 6 ? 'Good' : completed.length >= 3 ? 'Medium' : completed.length >= 2 ? 'Low' : 'Insufficient data',
    forecast: [],
    thisMonth: null,
    method: 'Weighted recent average + damped linear trend on revenue; margin and fixed costs from recent months.',
    reorder: [],
  };

  if (completed.length >= 2) {
    const rev = completed.map((r) => r.revenue);
    const fit = completed.length >= 3 ? linearFit(rev) : { slope: 0, sd: Math.abs(rev[1] - rev[0]) / 2 };
    const recent = rev.slice(-3);
    const weights = recent.map((_, i) => i + 1);
    const level = sum(recent, (v, i) => v * weights[i]) / sum(weights, (w) => w); // newest month counts most
    const slope = (fit.slope || 0) * 0.5; // damped so one odd month can't explode the forecast

    const totalRev = sum(completed, (r) => r.revenue) || 1;
    const margin = sum(completed, (r) => r.grossProfit) / totalRev;
    const last3 = completed.slice(-3);
    const avgExpenses = sum(last3, (r) => r.expenses) / last3.length;
    const avgSalaries = sum(last3, (r) => r.salaries) / last3.length;
    const salaries = avgSalaries > 0 ? avgSalaries : await A.staff.monthlyFullSalary(shop._id);

    for (let i = 1; i <= horizon; i++) {
      const { year, month } = fromKey(nowKey + i);
      const revenue = Math.max(0, level + slope * i);
      const band = fit.sd || 0;
      const grossProfit = revenue * margin;
      const net = grossProfit - avgExpenses - salaries;
      out.forecast.push({
        year, month, label: `${MONTH_LABELS[month - 1]} ${year}`,
        revenue: round(revenue), revenueLow: round(Math.max(0, revenue - band)), revenueHigh: round(revenue + band),
        grossProfit: round(grossProfit), expenses: round(avgExpenses), salaries: round(salaries),
        netProfit: round(net), status: net >= 0 ? 'Profit' : 'Loss',
      });
    }

    // run-rate projection of the month in progress
    if (currentRow) {
      const dim = daysInMonth(now.year, now.month);
      const so_far = currentRow.revenue;
      const projectedRevenue = (so_far / Math.max(1, now.day)) * dim;
      const m = currentRow.revenue > 0 ? currentRow.grossProfit / currentRow.revenue : margin;
      const exp = Math.max(currentRow.expenses, avgExpenses);
      const sal = Math.max(currentRow.salaries, salaries);
      const net = projectedRevenue * m - exp - sal;
      out.thisMonth = {
        label: `${MONTH_LABELS[now.month - 1]} ${now.year}`, daysElapsed: now.day, daysInMonth: dim,
        revenueSoFar: round(so_far), projectedRevenue: round(projectedRevenue),
        projectedNetProfit: round(net), status: net >= 0 ? 'Profit' : 'Loss',
      };
    }
  }

  // reorder suggestions from the last 30 days of selling speed
  const since = new Date(Date.now() - 30 * 86400000);
  const [recent, products] = await Promise.all([
    A.Sale.find({ shopId: shop._id, status: 'Completed', saleDate: { $gte: since } }).lean(),
    A.Product.find({ shopId: shop._id, isActive: true }).lean(),
  ]);
  const sold = new Map();
  recent.forEach((s) => (s.items || []).forEach((it) => {
    if (it.productId) sold.set(String(it.productId), (sold.get(String(it.productId)) || 0) + it.quantity);
  }));
  out.reorder = products
    .map((p) => {
      const sold30 = sold.get(String(p._id)) || 0;
      const rate = sold30 / 30;
      const daysLeft = rate > 0 ? p.stockQuantity / rate : null;
      const suggestedQty = Math.max(0, Math.ceil(rate * 30) - p.stockQuantity);
      return { productId: p._id, name: p.name, stock: p.stockQuantity, sold30, daysLeft: daysLeft === null ? null : Math.round(daysLeft * 10) / 10,
        suggestedQty, estCost: round(suggestedQty * (p.costPrice || 0)) };
    })
    .filter((r) => r.sold30 > 0 && r.daysLeft !== null && r.daysLeft <= 21 && r.suggestedQty > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  return out;
};

// ── Expenses ────────────────────────────────────────────────────────────────
exports.categories = EXPENSE_CATEGORIES;

exports.listExpenses = async (shopId, year, month) => {
  const { start, end } = monthRange(year, month);
  const items = await Expense.find({ shopId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
  const byCategory = {};
  items.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  return { items, total: sum(items, (e) => e.amount), byCategory };
};

exports.addExpense = async (shopId, { category, amount, date, note }) => {
  if (!(Number(amount) > 0)) throw new Error('Amount must be greater than 0');
  return Expense.create({ shopId, category: category || 'Misc', amount: Number(amount), date: toDay(date || new Date()), note: note || '' });
};

exports.removeExpense = (shopId, id) => Expense.findOneAndDelete({ _id: id, shopId });
