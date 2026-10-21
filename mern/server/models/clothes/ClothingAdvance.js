const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    clothingSalesmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingSalesman', required: true },
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    note: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);
schema.index({ clothingSalesmanId: 1, date: 1 });

module.exports = mongoose.model('ClothingAdvance', schema);
