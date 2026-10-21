const svc = require('../../services/clothes/clothingSaleService');
const billBuilder = require('../../services/clothes/billHtmlBuilder');

exports.getAll = async (req, res) => res.json(await svc.getAllSales(req.shop._id));

exports.getByDateRange = async (req, res) => {
  const { from, to } = req.query;
  res.json(await svc.getSalesByDateRange(from, to, req.shop._id));
};

exports.getById = async (req, res) => {
  const sale = await svc.getSaleById(req.params.id, req.shop._id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  res.json(sale);
};

exports.getByInvoice = async (req, res) => {
  const sale = await svc.getSaleByInvoice(req.params.invoiceNumber, req.shop._id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  res.json(sale);
};

exports.getStats = async (req, res) => {
  const { from, to } = req.query;
  const limit = Number(req.query.limit) || 5;
  const [revenue, transactions, topProducts] = await Promise.all([
    svc.getTotalRevenue(from, to, req.shop._id),
    svc.getTotalTransactions(from, to, req.shop._id),
    svc.getTopSellingProducts(from, to, limit, req.shop._id),
  ]);
  res.json({ revenue, transactions, topProducts });
};

exports.create = async (req, res) => {
  try {
    const sale = await svc.processSale(req.body, req.shop._id);
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.refund = async (req, res) => {
  try {
    res.json(await svc.refundSale(req.params.id, req.shop._id));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.printBill = async (req, res) => {
  const sale = await svc.getSaleById(req.params.id, req.shop._id);
  if (!sale) return res.status(404).send('Sale not found');
  // Original always calls BillHtmlBuilder.Build(sale) with its default shop name/address
  const html = billBuilder.build(sale);
  res.set('Content-Type', 'text/html');
  res.send(html);
};
