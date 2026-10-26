const mongoose = require('mongoose');

const clothingProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    brand: { type: String, maxlength: 100, default: '' },
    sku: { type: String, maxlength: 50, default: '' },
    category: { type: String, maxlength: 100, default: '' },
    gender: { type: String, maxlength: 20, default: 'Unisex' },
    size: { type: String, maxlength: 20, default: '' },
    color: { type: String, maxlength: 50, default: '' },
    material: { type: String, maxlength: 100, default: '' },
    season: { type: String, maxlength: 20, default: 'All Season' },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: null },
    stockQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    imageUrl: { type: String, maxlength: 2000, default: null },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    // Shown on the public Store (defaults to true so all products are live automatically).
    isPublished: { type: Boolean, default: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Serves the public catalogue query (storefront list per shop, newest first).
clothingProductSchema.index({ shopId: 1, isPublished: 1, isActive: 1, createdAt: -1 });

clothingProductSchema.virtual('isOutOfStock').get(function () {
  return this.stockQuantity <= 0;
});
clothingProductSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity > 0 && this.stockQuantity <= this.lowStockThreshold;
});
// Mirrors EffectivePrice in the C# model
clothingProductSchema.virtual('effectivePrice').get(function () {
  if (this.discountedPrice && this.discountedPrice > 0 && this.discountedPrice < this.sellingPrice) {
    return this.discountedPrice;
  }
  return this.sellingPrice;
});
clothingProductSchema.set('toJSON', { virtuals: true });
clothingProductSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ClothingProduct', clothingProductSchema);
