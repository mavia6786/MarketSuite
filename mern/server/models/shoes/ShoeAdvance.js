const mongoose = require('mongoose');

// An advance (loan against salary) given to a salesman. It is deducted from the
// salary of the month in which it was given.
const schema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    salesmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShoeSalesman', required: true },
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    note: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);
schema.index({ salesmanId: 1, date: 1 });

module.exports = mongoose.model('ShoeAdvance', schema);
