const saleService = require('../../services/shoes/saleService');

exports.create = async (req, res) => {
  try {
    const { customerName, customerPhone, paymentMethod, discountAmount, cartItems, notes } = req.body;
    if (!cartItems || !cartItems.length) return res.status(400).json({ message: 'Cart is empty.' });

    const sale = await saleService.createSale(req.shop._id, req.user._id, {
      customerName,
      customerPhone,
      paymentMethod,
      discountAmount: discountAmount || 0,
      cartItems,
      notes,
    });
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  const { from, to } = req.query;
  res.json(await saleService.getAllSales(req.shop._id, from, to));
};

exports.getById = async (req, res) => {
  const sale = await saleService.getSaleById(req.params.id, req.shop._id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  res.json(sale);
};

exports.getDashboardStats = async (req, res) => {
  const { from, to } = req.query;
  const [revenue, orders, avgOrder, last7Days, topProducts] = await Promise.all([
    saleService.getTotalRevenue(req.shop._id, from, to),
    saleService.getTotalOrders(req.shop._id, from, to),
    saleService.getAverageOrderValue(req.shop._id),
    saleService.getLast7DaysSales(req.shop._id),
    saleService.getTopProducts(req.shop._id, 5),
  ]);
  res.json({ revenue, orders, avgOrder, last7Days, topProducts });
};

exports.refund = async (req, res) => {
  try {
    res.json(await saleService.refundSale(req.params.id, req.shop._id));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
