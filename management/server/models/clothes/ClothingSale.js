const mongoose = require('mongoose');

const clothingSaleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingProduct', default: null },
    productName: { type: String, required: true, maxlength: 200 },
    size: { type: String, maxlength: 20, default: null },
    color: { type: String, maxlength: 50, default: null },
    sku: { type: String, maxlength: 50, default: null },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: true }
);

const clothingSaleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, maxlength: 50, default: '' },
  customerName: { type: String, maxlength: 200, default: null },
  customerPhone: { type: String, maxlength: 20, default: null },
  customerEmail: { type: String, maxlength: 200, default: null },
  paymentMethod: { type: String, maxlength: 50, default: 'Cash' },
  // Completed, Refunded, Pending
  status: { type: String, maxlength: 50, default: 'Completed' },
  salesmanName: { type: String, maxlength: 100, default: null },
  subTotal: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  totalItemCount: { type: Number, default: 0 },
  notes: { type: String, default: null },
  items: [clothingSaleItemSchema],
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  saleDate: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
},
{ timestamps: { createdAt: 'createdAt', updatedAt: false } });

module.exports = mongoose.model('ClothingSale', clothingSaleSchema);
