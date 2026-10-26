const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    brand: { type: String, maxlength: 100, default: '' },
    // Men, Women, Kids
    category: { type: String, maxlength: 50, default: 'Men' },
    // Running, Casual, Sports, Formal
    subCategory: { type: String, maxlength: 100, default: '' },
    // what the shop paid for it (needed for real profit/loss)
    costPrice: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    originalPrice: { type: Number, default: null },
    stockQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    // comma-separated, e.g. "38,39,40,41,42,43"
    sizesJson: { type: String, maxlength: 500, default: '' },
    // comma-separated, e.g. "Black,White,Red"
    colorsJson: { type: String, maxlength: 500, default: '' },
    imageUrl: { type: String, default: '' },
    description: { type: String, maxlength: 1000, default: '' },
    isActive: { type: Boolean, default: true },
    // Shown on the public Store (defaults to true so all products are live automatically).
    isPublished: { type: Boolean, default: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Serves the public catalogue query (storefront list per shop, newest first).
productSchema.index({ shopId: 1, isPublished: 1, isActive: 1, createdAt: -1 });

productSchema.virtual('sizes').get(function () {
  return this.sizesJson ? this.sizesJson.split(',').map((s) => s.trim()).filter(Boolean) : [];
});
productSchema.virtual('colors').get(function () {
  return this.colorsJson ? this.colorsJson.split(',').map((c) => c.trim()).filter(Boolean) : [];
});
productSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity > 0 && this.stockQuantity <= this.lowStockThreshold;
});
productSchema.virtual('isOutOfStock').get(function () {
  return this.stockQuantity <= 0;
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ShoeProduct', productSchema);
