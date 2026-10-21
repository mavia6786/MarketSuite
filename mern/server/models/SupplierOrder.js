const mongoose = require('mongoose');

// Line items of a purchase order. productId links to the shop's catalogue (optional for free-text items).
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, default: null },
    productName: { type: String, required: true, maxlength: 200 },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

// Every payment made to the supplier against this order (partial payments supported).
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    method: { type: String, maxlength: 50, default: 'Cash' },
    note: { type: String, maxlength: 300, default: '' },
  },
  { _id: true }
);

const supplierOrderSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  orderNumber: { type: String, maxlength: 100, default: '' },
  itemsDescription: { type: String, maxlength: 1000, default: '' },
  items: { type: [orderItemSchema], default: [] },
  payments: { type: [paymentSchema], default: [] },
  totalAmount: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  // Pending, Confirmed, Delivered, Cancelled
  status: { type: String, maxlength: 50, default: 'Pending' },
  // true once the received quantities have been added to inventory (guards against receiving twice)
  stockApplied: { type: Boolean, default: false },
  orderDate: { type: Date, default: Date.now },
  expectedDelivery: { type: Date, default: null },
  actualDelivery: { type: Date, default: null },
  notes: { type: String, maxlength: 500, default: '' },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
});
supplierOrderSchema.index({ shopId: 1, orderDate: -1 });
supplierOrderSchema.index({ shopId: 1, supplierId: 1 });

// Mirrors the C# [NotMapped] PendingAmount computed property
supplierOrderSchema.virtual('pendingAmount').get(function () {
  return this.totalAmount - this.paidAmount;
});
supplierOrderSchema.set('toJSON', { virtuals: true });
supplierOrderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SupplierOrder', supplierOrderSchema);
