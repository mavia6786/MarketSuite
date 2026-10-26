const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 200 },
    brand: { type: String, maxlength: 100, default: '' },
    category: { type: String, maxlength: 100, default: '' },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    size: { type: String, maxlength: 50, default: '' },
    color: { type: String, maxlength: 50, default: '' },
    imageUrl: { type: String, maxlength: 2000, default: '' },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'System' },
    note: { type: String, maxlength: 500, default: '' },
  },
  { _id: false }
);

const onlineOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    shopName: { type: String, required: true },
    shopSlug: { type: String, required: true, index: true },
    shopType: { type: String, enum: ['Shoes', 'Clothes'], required: true },
    customer: {
      name: { type: String, required: true, maxlength: 100, trim: true },
      phone: { type: String, required: true, maxlength: 30, trim: true, index: true },
      address: { type: String, required: true, maxlength: 300, trim: true },
      city: { type: String, maxlength: 100, trim: true, default: '' },
      notes: { type: String, maxlength: 500, trim: true, default: '' },
    },
    items: {
      type: [orderItemSchema],
      validate: [(val) => val && val.length > 0 && val.length <= 50, 'Order must contain 1 to 50 items'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['COD'], default: 'COD' },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    statusHistory: [statusHistorySchema],
    cancelReason: { type: String, maxlength: 500, default: '' },
    saleId: { type: mongoose.Schema.Types.ObjectId, default: null },
    invoiceNumber: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

onlineOrderSchema.index({ shopId: 1, createdAt: -1 });
onlineOrderSchema.index({ orderNumber: 1, 'customer.phone': 1 });

module.exports = mongoose.model('OnlineOrder', onlineOrderSchema);
