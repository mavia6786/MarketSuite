// Fills the two DEMO shops (admin@stepup.pk / admin@stylehub.pk) with ~6 months of realistic activity
// so Profit/Loss, Forecast, Salary, Advances and Supplier ledgers have something to show.
//   npm run seed:demo
// WARNING: it first DELETES sales / expenses / attendance / advances / supplier orders of those two demo shops only.
// Your own real shops are never touched.
require('dotenv').config();
// Safety guard: this script changes existing data. It refuses to run in production and needs an explicit --yes.
if (process.env.NODE_ENV === 'production') { console.error('Refusing to run seedDemo in production.'); process.exit(1); }
if (!process.argv.includes('--yes')) { console.error('This DELETES sales/expenses/staff activity/supplier data of the two demo shops (admin@stepup.pk, admin@stylehub.pk) and refills it with fake data.\nRe-run with --yes to confirm:  npm run seed:demo -- --yes'); process.exit(1); }
const connectDB = require('./config/db');
const seedBase = require('./seed');
const Shop = require('./models/Shop');
const Expense = require('./models/Expense');
const Supplier = require('./models/Supplier');
const SupplierOrder = require('./models/SupplierOrder');
const ShoeProduct = require('./models/shoes/Product');
const ShoeSale = require('./models/shoes/Sale');
const ShoeSalesman = require('./models/shoes/Salesman');
const ShoeAtt = require('./models/shoes/SalesmanAttendance');
const ShoeAdv = require('./models/shoes/ShoeAdvance');
const ShoeSal = require('./models/shoes/ShoeSalaryRecord');
const ClothProduct = require('./models/clothes/ClothingProduct');
const ClothSale = require('./models/clothes/ClothingSale');
const ClothSalesman = require('./models/clothes/ClothingSalesman');
const ClothAtt = require('./models/clothes/ClothingSalesmanAttendance');
const ClothAdv = require('./models/clothes/ClothingAdvance');
const ClothSal = require('./models/clothes/ClothingSalaryRecord');

let seedN = 42;
const rnd = () => ((seedN = (seedN * 1664525 + 1013904223) % 4294967296) / 4294967296); // repeatable
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));

const MONTHS_BACK = 6;
const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, 1);

function eachDay(cb) {
  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) cb(new Date(d));
}
const utcDay = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

async function seedShop({ shop, products, Sale, buildSale, Staff, Att, attKey, Adv, Sal, salKey, supplierRows, expenseBase }) {
  const shopId = shop._id;
  await Promise.all([
    Sale.deleteMany({ shopId }), Expense.deleteMany({ shopId }), SupplierOrder.deleteMany({ shopId }), Supplier.deleteMany({ shopId }),
    Adv.deleteMany({ shopId }),
  ]);
  const staff = await Staff.find({ shopId });
  await Att.deleteMany({ [attKey]: { $in: staff.map((s) => s._id) } });
  await Sal.deleteMany({ [salKey]: { $in: staff.map((s) => s._id) } });

  // sales — gentle growth + busier weekends + a dip month, so the chart is not a flat line
  const monthIdx = (d) => (d.getFullYear() - startDate.getFullYear()) * 12 + d.getMonth() - startDate.getMonth();
  const sales = [];
  eachDay((day) => {
    if (day.getDay() === 0 && rnd() < 0.6) return;
    const growth = 1 + monthIdx(day) * 0.08;
    const dip = monthIdx(day) === 2 ? 0.7 : 1;
    const weekend = day.getDay() === 5 || day.getDay() === 6 ? 1.4 : 1;
    const n = Math.round(rnd() * 3 * growth * dip * weekend);
    for (let i = 0; i < n; i++) {
      const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), ri(10, 20), ri(0, 59));
      if (when > now) continue;
      sales.push(buildSale(when, [...Array(ri(1, 2))].map(() => pick(products)), sales.length + 1));
    }
  });
  for (let i = 0; i < sales.length; i += 200) await Sale.insertMany(sales.slice(i, i + 200));

  // monthly running costs
  const expenses = [];
  for (let m = 0; m <= MONTHS_BACK; m++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + m, 5);
    if (d > now) break;
    expenses.push({ shopId, category: 'Rent', amount: expenseBase.rent, date: utcDay(d), note: 'Monthly shop rent' });
    expenses.push({ shopId, category: 'Electricity', amount: ri(expenseBase.elec[0], expenseBase.elec[1]), date: utcDay(new Date(d.getFullYear(), d.getMonth(), 12)), note: 'WAPDA bill' });
    expenses.push({ shopId, category: 'Misc', amount: ri(2000, 7000), date: utcDay(new Date(d.getFullYear(), d.getMonth(), 20)), note: 'Tea, cleaning, small repairs' });
    if (m % 2 === 0) expenses.push({ shopId, category: 'Marketing', amount: ri(3000, 8000), date: utcDay(new Date(d.getFullYear(), d.getMonth(), 15)), note: 'Social media ads' });
  }
  await Expense.insertMany(expenses.filter((e) => e.date <= now));

  // attendance (~93% present), advances, bonus
  for (const s of staff) {
    const att = []; const adv = [];
    eachDay((day) => {
      if (day.getDay() === 0 || day > now) return;
      att.push({ [attKey]: s._id, date: utcDay(day), isPresent: rnd() < 0.93, checkIn: '10:00', checkOut: '19:00', workingHours: 9 });
    });
    await Att.insertMany(att);
    for (let m = 0; m <= MONTHS_BACK; m++) {
      if (rnd() < 0.4) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + m, ri(8, 22));
        if (d <= now) adv.push({ shopId, [attKey]: s._id, amount: pick([2000, 3000, 5000, 5000, 8000]), date: utcDay(d), note: pick(['Family need', 'Medical', 'Eid shopping', 'Advance']) });
      }
    }
    if (adv.length) await Adv.insertMany(adv);
    // pay past months' salaries, leave current month unpaid
    for (let m = 0; m < MONTHS_BACK; m++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
      await Sal.create({ [salKey]: s._id, month: d.getMonth() + 1, year: d.getFullYear(), isPaid: true, amountPaid: s.salary, paidAt: new Date(d.getFullYear(), d.getMonth() + 1, 2), bonus: rnd() < 0.2 ? 2000 : 0 });
    }
  }

  // suppliers + purchase orders with items & partial payments
  const suppliers = await Supplier.insertMany(supplierRows.map((r) => ({ ...r, shopId, isActive: true, createdAt: new Date() })));
  let po = 0;
  for (let m = 0; m <= MONTHS_BACK; m++) {
    for (const sup of suppliers) {
      if (rnd() < 0.55) continue;
      const items = [...Array(ri(1, 3))].map(() => {
        const p = pick(products);
        return { productId: p._id, productName: p.name, quantity: ri(6, 25), unitCost: p.costPrice };
      });
      const total = items.reduce((a, i) => a + i.quantity * i.unitCost, 0);
      const orderDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, ri(1, 25));
      if (orderDate > now) continue;
      const old = m < MONTHS_BACK - 1;
      const delivered = old || rnd() < 0.5;
      const paid = old ? total : Math.round((total * pick([0, 0.3, 0.5, 1])) / 100) * 100;
      po += 1;
      await SupplierOrder.create({
        shopId, supplierId: sup._id, orderNumber: `PO-DEMO-${String(po).padStart(4, '0')}`,
        items, itemsDescription: items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
        totalAmount: total, paidAmount: paid,
        payments: paid > 0 ? [{ amount: paid, date: new Date(orderDate.getTime() + 3 * 86400000), method: pick(['Cash', 'Bank']), note: old ? 'Cleared' : 'Part payment' }] : [],
        status: delivered ? 'Delivered' : 'Pending', orderDate,
        expectedDelivery: new Date(orderDate.getTime() + 7 * 86400000),
        actualDelivery: delivered ? new Date(orderDate.getTime() + 6 * 86400000) : null,
        stockApplied: delivered,
      });
    }
  }
  console.log(`  ${shop.name}: ${sales.length} sales, ${expenses.length} expenses, ${staff.length} staff, ${po} purchase orders`);
}

(async () => {
  await connectDB();
  await seedBase({ connect: false });

  const shoeShop = await Shop.findOne({ email: 'admin@stepup.pk' });
  const clothShop = await Shop.findOne({ email: 'admin@stylehub.pk' });
  if (!shoeShop || !clothShop) throw new Error('Demo shops not found (admin@stepup.pk / admin@stylehub.pk).');

  console.log('Generating demo history...');
  const shoeProducts = await ShoeProduct.find({ shopId: shoeShop._id, isActive: true });
  await seedShop({
    shop: shoeShop, products: shoeProducts, Sale: ShoeSale, Staff: ShoeSalesman, Att: ShoeAtt, attKey: 'salesmanId', Adv: ShoeAdv, Sal: ShoeSal, salKey: 'salesmanId',
    expenseBase: { rent: 45000, elec: [14000, 26000] },
    buildSale: (when, picks, n) => {
      const items = picks.map((p) => ({ productId: p._id, productName: p.name, size: pick((p.sizesJson || '42').split(',')), color: pick((p.colorsJson || 'Black').split(',')), quantity: 1, unitPrice: p.price, unitCost: p.costPrice }));
      const subTotal = items.reduce((a, i) => a + i.unitPrice, 0);
      const discountAmount = rnd() < 0.25 ? pick([500, 1000, 2000]) : 0;
      return { shopId: shoeShop._id, invoiceNumber: `INV-DEMO-${n}`, saleDate: when, customerName: 'Walk-in Customer', subTotal, discountAmount, taxAmount: 0, total: subTotal - discountAmount, paymentMethod: pick(['Cash', 'Cash', 'Card', 'Digital']), status: rnd() < 0.03 ? 'Refunded' : 'Completed', items };
    },
    supplierRows: [
      { companyName: 'Nike Pakistan', contactPerson: 'Tariq Mehmood', phone: '04235551001', city: 'Lahore', productsSupplied: 'Nike Air Max, Air Zoom' },
      { companyName: 'Adidas Traders', contactPerson: 'Hina Baig', phone: '04235552002', city: 'Lahore', productsSupplied: 'Adidas Ultraboost' },
      { companyName: 'Bata Wholesale', contactPerson: 'Farrukh Siddiqui', phone: '04235554004', city: 'Lahore', productsSupplied: 'Bata formal shoes' },
    ],
  });

  // clothes (ensure it has staff — the base seed only creates them for shoes)
  if (!(await ClothSalesman.countDocuments({ shopId: clothShop._id }))) {
    await ClothSalesman.insertMany([
      { shopId: clothShop._id, name: 'Imran Shah', employeeId: 'CLT-001', phone: '03051111111', salary: 28000, joiningDate: new Date(2024, 0, 5), isActive: true },
      { shopId: clothShop._id, name: 'Rabia Khan', employeeId: 'CLT-002', phone: '03052222222', salary: 26000, joiningDate: new Date(2024, 1, 1), isActive: true },
      { shopId: clothShop._id, name: 'Zeeshan Ali', employeeId: 'CLT-003', phone: '03053333333', salary: 24000, joiningDate: new Date(2024, 3, 1), isActive: true },
    ]);
  }
  const clothProducts = await ClothProduct.find({ shopId: clothShop._id, isActive: true });
  await seedShop({
    shop: clothShop, products: clothProducts, Sale: ClothSale, Staff: ClothSalesman, Att: ClothAtt, attKey: 'clothingSalesmanId', Adv: ClothAdv, Sal: ClothSal, salKey: 'clothingSalesmanId',
    expenseBase: { rent: 38000, elec: [10000, 20000] },
    buildSale: (when, picks, n) => {
      const items = picks.map((p) => { const q = ri(1, 3); return { productId: p._id, productName: p.name, size: pick(['S', 'M', 'L', 'XL']), color: p.color || 'Black', quantity: q, unitPrice: p.sellingPrice, unitCost: p.costPrice, lineTotal: q * p.sellingPrice }; });
      const subTotal = items.reduce((a, i) => a + i.lineTotal, 0);
      const discountAmount = rnd() < 0.2 ? pick([200, 300, 500]) : 0;
      const total = subTotal - discountAmount;
      return { shopId: clothShop._id, invoiceNumber: `CL-DEMO-${n}`, saleDate: when, customerName: pick(['Walk-in', 'Ayesha', 'Hina', 'Usman', 'Bilal']), paymentMethod: pick(['Cash', 'Cash', 'Card', 'Digital']), status: rnd() < 0.03 ? 'Refunded' : 'Completed', salesmanName: pick(['Imran Shah', 'Rabia Khan', 'Zeeshan Ali']), subTotal, discountAmount, taxAmount: 0, totalAmount: total, amountPaid: total, totalItemCount: items.reduce((a, i) => a + i.quantity, 0), items };
    },
    supplierRows: [
      { companyName: 'Lahore Textile Mills', contactPerson: 'Asad Raza', phone: '04235556001', city: 'Lahore', productsSupplied: 'T-shirts, shirts' },
      { companyName: 'Denim House', contactPerson: 'Sobia Nadeem', phone: '04235557002', city: 'Faisalabad', productsSupplied: 'Jeans, jackets' },
      { companyName: 'Zara Importers', contactPerson: 'Kamran Butt', phone: '04235558003', city: 'Karachi', productsSupplied: 'Dresses, hoodies' },
    ],
  });
  console.log('Demo data ready. Log in as admin@stepup.pk or admin@stylehub.pk (Admin@123).');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
