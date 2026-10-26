const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShoeProduct', default: null },
    productName: { type: String, maxlength: 200, default: '' },
    size: { type: String, maxlength: 20, default: '' },
    color: { type: String, maxlength: 50, default: '' },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    // cost snapshot at time of sale (so later cost changes don't rewrite history)
    unitCost: { type: Number, default: 0 },
  },
  { _id: true }
);
saleItemSchema.virtual('lineTotal').get(function () {
  return this.unitPrice * this.quantity;
});
saleItemSchema.set('toJSON', { virtuals: true });
saleItemSchema.set('toObject', { virtuals: true });

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, maxlength: 50, default: '' },
  saleDate: { type: Date, default: Date.now },
  subTotal: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  // Cash, Card, Digital
  paymentMethod: { type: String, maxlength: 50, default: 'Cash' },
  customerName: { type: String, maxlength: 200, default: 'Walk-in Customer' },
  customerPhone: { type: String, maxlength: 20, default: '' },
  // Completed, Refunded, Pending
  status: { type: String, maxlength: 50, default: 'Completed' },
  notes: { type: String, default: '' },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items: [saleItemSchema],
});

module.exports = mongoose.model('ShoeSale', saleSchema);
