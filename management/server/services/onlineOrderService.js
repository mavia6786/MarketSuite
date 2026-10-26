const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const ShoeProduct = require('../models/shoes/Product');
const ClothingProduct = require('../models/clothes/ClothingProduct');
const ShoeSale = require('../models/shoes/Sale');
const ClothingSale = require('../models/clothes/ClothingSale');
const OnlineOrder = require('../models/OnlineOrder');
const Counter = require('../models/Counter');
const money = require('../utils/money');
const { isValidSlug } = require('../utils/slug');
const { isId } = require('../utils/validate');

class BadOrderInput extends Error {
  constructor(message, code = 'VALIDATION', status = 400) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const normalizePhone = (p) => String(p || '').replace(/[\s\-\(\)]/g, '').trim();

function getEffectivePrice(type, product) {
  if (type === 'Clothes') {
    const discounted =
      product.discountedPrice &&
      product.discountedPrice > 0 &&
      product.discountedPrice < product.sellingPrice;
    return {
      price: discounted ? product.discountedPrice : product.sellingPrice,
      originalPrice: discounted ? product.sellingPrice : null,
    };
  }
  const original = product.originalPrice && product.originalPrice > product.price ? product.originalPrice : null;
  return {
    price: product.price,
    originalPrice: original,
  };
}

const modelFor = (type) => (type === 'Clothes' ? ClothingProduct : ShoeProduct);

/**
 * Public Guest Checkout with Cash on Delivery (COD).
 * - Re-prices everything from the DB (client price is strictly ignored).
 * - Checks published status and shop ownership.
 * - Atomically decrements stock.
 * - Rolls back previously decremented items if any item has insufficient stock.
 */
async function createOnlineOrder(slug, payload) {
  if (!slug || !isValidSlug(slug)) {
    throw new BadOrderInput('Invalid shop identifier.', 'SHOP_NOT_FOUND', 404);
  }

  const shop = await Shop.findOne({
    slug,
    storefrontEnabled: true,
    isActive: { $ne: false },
  }).lean();

  if (!shop) {
    throw new BadOrderInput('Shop not found or not accepting online orders.', 'SHOP_NOT_FOUND', 404);
  }

  const customerRaw = payload?.customer || {};
  const name = String(customerRaw.name || '').trim();
  const phone = String(customerRaw.phone || '').trim();
  const address = String(customerRaw.address || '').trim();
  const city = String(customerRaw.city || shop.city || '').trim();
  const notes = String(customerRaw.notes || '').trim().slice(0, 500);

  if (!name || name.length < 2 || name.length > 100) {
    throw new BadOrderInput('Please provide your name (2 to 100 characters).');
  }
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 20 || !/^(\+?\d{7,15})$/.test(cleanPhone)) {
    throw new BadOrderInput('Please provide a valid phone number (e.g. 03001234567).');
  }
  if (!address || address.length < 5 || address.length > 300) {
    throw new BadOrderInput('Please provide a complete delivery address (5 to 300 characters).');
  }

  const itemsRaw = payload?.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    throw new BadOrderInput('Your cart is empty. Add items before placing an order.');
  }
  if (itemsRaw.length > 20) {
    throw new BadOrderInput('An order can contain at most 20 different items.');
  }

  const Model = modelFor(shop.type);
  const validatedItems = [];
  const decremented = [];

  try {
    for (const raw of itemsRaw) {
      const productId = raw.productId || raw.id;
      if (!isId(productId)) {
        throw new BadOrderInput('Invalid product in cart.');
      }
      const qty = Number(raw.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        throw new BadOrderInput('Quantity must be a whole number between 1 and 10 per item.');
      }

      // Fetch product to re-price and verify active/published
      const p = await Model.findOne({
        _id: productId,
        shopId: shop._id,
        isPublished: true,
        isActive: true,
      }).lean();

      if (!p) {
        throw new BadOrderInput(
          `One of the products in your cart is no longer available. Please refresh your cart.`,
          'PRODUCT_NOT_AVAILABLE'
        );
      }

      if (p.stockQuantity < qty) {
        throw new BadOrderInput(
          `"${p.name}" has only ${p.stockQuantity} item(s) left in stock.`,
          'INSUFFICIENT_STOCK'
        );
      }

      // Atomic conditional decrement to prevent concurrency race conditions
      const decrementedDoc = await Model.findOneAndUpdate(
        {
          _id: productId,
          shopId: shop._id,
          stockQuantity: { $gte: qty },
        },
        { $inc: { stockQuantity: -qty } },
        { new: true }
      );

      if (!decrementedDoc) {
        throw new BadOrderInput(
          `"${p.name}" ran out of stock. Please adjust quantity.`,
          'INSUFFICIENT_STOCK'
        );
      }

      decremented.push({ productId, quantity: qty });

      const { price, originalPrice } = getEffectivePrice(shop.type, p);
      const lineTotal = money.mul(price, qty);

      validatedItems.push({
        productId: p._id,
        name: p.name,
        brand: p.brand || '',
        category: p.category || '',
        price,
        originalPrice,
        quantity: qty,
        size: String(raw.size || '').trim().slice(0, 50),
        color: String(raw.color || '').trim().slice(0, 50),
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl.slice(0, 2000) : '',
        lineTotal,
      });
    }

    const subtotal = money.sum(validatedItems, (it) => it.lineTotal);
    const shippingFee = 0; // Free delivery for standard COD
    const total = money.add(subtotal, shippingFee);

    const seq = await Counter.next('online-order');
    const orderNumber = `ORD-${String(seq).padStart(5, '0')}`;

    const order = new OnlineOrder({
      orderNumber,
      shopId: shop._id,
      shopName: shop.name,
      shopSlug: shop.slug,
      shopType: shop.type,
      customer: {
        name,
        phone,
        address,
        city,
        notes,
      },
      items: validatedItems,
      subtotal,
      shippingFee,
      total,
      paymentMethod: 'COD',
      status: 'Pending',
      statusHistory: [
        {
          status: 'Pending',
          changedAt: new Date(),
          changedBy: 'Customer',
          note: 'Order placed via online storefront (Cash on Delivery)',
        },
      ],
    });

    await order.save();

    return {
      orderNumber: order.orderNumber,
      shopName: shop.name,
      shopSlug: shop.slug,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
        city: order.customer.city,
      },
      itemsCount: order.items.reduce((s, it) => s + it.quantity, 0),
      items: order.items.map((it) => ({
        productId: String(it.productId),
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        originalPrice: it.originalPrice,
        size: it.size,
        color: it.color,
        lineTotal: it.lineTotal,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt,
    };
  } catch (err) {
    // Rollback any stocks decremented in this failed checkout attempt
    if (decremented.length > 0) {
      for (const item of decremented) {
        try {
          await Model.findOneAndUpdate(
            { _id: item.productId, shopId: shop._id },
            { $inc: { stockQuantity: item.quantity } }
          );
        } catch (rollbackErr) {
          console.error('Failed to rollback stock for product:', item.productId, rollbackErr);
        }
      }
    }
    throw err;
  }
}

/**
 * Public Customer Order Lookup.
 * Looks up an order by orderNumber + phone number.
 */
async function lookupOnlineOrder({ orderNumber, phone }) {
  const num = String(orderNumber || '').trim();
  const rawPhone = String(phone || '').trim();
  const cleanPhone = normalizePhone(rawPhone);

  if (!num || !cleanPhone) {
    throw new BadOrderInput('Please provide both Order Number and Phone Number.');
  }

  // Cross-shop order lookup allows customer to track their order without knowing internal shopId
  const order = await OnlineOrder.findOne({
    orderNumber: new RegExp(`^${num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  })
    .setOptions({ allowCrossShop: true })
    .lean();

  if (!order) {
    throw new BadOrderInput('Order not found. Please check your order number.', 'ORDER_NOT_FOUND', 404);
  }

  const orderCleanPhone = normalizePhone(order.customer.phone);
  if (
    cleanPhone !== orderCleanPhone &&
    !cleanPhone.endsWith(orderCleanPhone) &&
    !orderCleanPhone.endsWith(cleanPhone)
  ) {
    throw new BadOrderInput('Phone number does not match this order number.', 'ORDER_NOT_FOUND', 404);
  }

  return {
    orderNumber: order.orderNumber,
    shopName: order.shopName,
    shopSlug: order.shopSlug,
    shopType: order.shopType,
    status: order.status,
    statusHistory: (order.statusHistory || []).map((h) => ({
      status: h.status,
      changedAt: h.changedAt,
      note: h.note,
    })),
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
      city: order.customer.city || '',
    },
    items: order.items.map((it) => ({
      name: it.name,
      brand: it.brand || '',
      price: it.price,
      originalPrice: it.originalPrice,
      quantity: it.quantity,
      size: it.size || '',
      color: it.color || '',
      imageUrl: it.imageUrl || '',
      lineTotal: it.lineTotal,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    paymentMethod: order.paymentMethod,
    cancelReason: order.cancelReason || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Portal Order List (Shop Scoped).
 */
async function listShopOrders(shopId, query = {}) {
  const filter = { shopId };
  if (query.status && query.status !== 'All') {
    filter.status = query.status;
  }
  if (query.q) {
    const term = String(query.q).trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderNumber: regex },
      { 'customer.name': regex },
      { 'customer.phone': regex },
    ];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20));

  const [orders, total] = await Promise.all([
    OnlineOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    OnlineOrder.countDocuments(filter),
  ]);

  return {
    items: orders,
    total,
    page,
    pageSize,
  };
}

/**
 * Auto-create a Sale record when an online order is delivered.
 * This makes the completed online order appear in Sales History.
 * Stock is NOT deducted again — it was already deducted at checkout.
 */
async function createSaleFromOrder(order) {
  const now = new Date();

  if (order.shopType === 'Clothes') {
    const day = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = await Counter.next(`cloth-inv:${order.shopId}:${day}`);
    const invoiceNumber = `CL-${day}-${String(seq).padStart(4, '0')}`;

    const sale = await ClothingSale.create({
      invoiceNumber,
      shopId: order.shopId,
      customerName: order.customer.name,
      customerPhone: order.customer.phone || null,
      customerEmail: null,
      paymentMethod: 'COD',
      status: 'Completed',
      salesmanName: 'Online Store',
      notes: `Online order ${order.orderNumber}. ${order.customer.address}, ${order.customer.city}`.trim(),
      subTotal: order.subtotal,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: order.total,
      amountPaid: order.total,
      totalItemCount: order.items.reduce((n, it) => n + it.quantity, 0),
      saleDate: now,
      items: order.items.map((it) => ({
        productId: it.productId,
        productName: it.name,
        size: it.size || null,
        color: it.color || null,
        sku: null,
        quantity: it.quantity,
        unitPrice: it.price,
        unitCost: 0,
        discountAmount: 0,
        lineTotal: it.lineTotal,
      })),
    });

    return { saleId: sale._id, invoiceNumber };
  }

  // Shoes
  const year = now.getFullYear();
  const seq = await Counter.next(`shoe-inv:${order.shopId}:${year}`);
  const invoiceNumber = `INV-${year}-${String(seq).padStart(4, '0')}`;

  const sale = await ShoeSale.create({
    invoiceNumber,
    shopId: order.shopId,
    cashierId: null,
    customerName: order.customer.name,
    customerPhone: order.customer.phone || '',
    paymentMethod: 'COD',
    status: 'Completed',
    notes: `Online order ${order.orderNumber}. ${order.customer.address}, ${order.customer.city}`.trim(),
    subTotal: order.subtotal,
    discountAmount: 0,
    taxAmount: 0,
    total: order.total,
    saleDate: now,
    items: order.items.map((it) => ({
      productId: it.productId,
      productName: it.name,
      size: it.size || '',
      color: it.color || '',
      quantity: it.quantity,
      unitPrice: it.price,
      unitCost: 0,
    })),
  });

  return { saleId: sale._id, invoiceNumber };
}

/**
 * Portal Order Status Update (Shop Scoped).
 * Restores stock if order is Cancelled.
 * Auto-creates a Sale record when order is Delivered (so it appears in Sales History).
 */
async function updateOrderStatus(shopId, orderId, { status, note, user }) {
  if (!isId(orderId)) {
    throw new BadOrderInput('Invalid order ID.');
  }

  const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    throw new BadOrderInput(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const order = await OnlineOrder.findOne({ _id: orderId, shopId });
  if (!order) {
    throw new BadOrderInput('Order not found.', 'ORDER_NOT_FOUND', 404);
  }

  const oldStatus = order.status;
  if (oldStatus === status) {
    return order;
  }

  // If cancelling an order, restore product stock
  if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
    const Model = modelFor(order.shopType);
    for (const item of order.items) {
      await Model.findOneAndUpdate(
        { _id: item.productId, shopId },
        { $inc: { stockQuantity: item.quantity } }
      );
    }
    order.cancelReason = note || 'Cancelled by merchant';
  }

  // Auto-create a Sale record when order is marked as Delivered
  if (status === 'Delivered' && oldStatus !== 'Delivered' && !order.saleId) {
    try {
      const { saleId, invoiceNumber } = await createSaleFromOrder(order);
      order.saleId = saleId;
      order.invoiceNumber = invoiceNumber;
    } catch (saleErr) {
      console.error('Failed to auto-create sale from online order:', order.orderNumber, saleErr);
      // Don't block the status update — the sale can be created manually later
    }
  }

  order.status = status;
  order.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: user?.name || user?.role || 'Staff',
    note: note || `Status updated to ${status}`,
  });

  await order.save();
  return order;
}

module.exports = {
  createOnlineOrder,
  lookupOnlineOrder,
  listShopOrders,
  updateOrderStatus,
  BadOrderInput,
};
