const mongoose = require('mongoose');

// Shop running costs (rent, electricity, ...). Salaries and stock purchases are tracked elsewhere.
const schema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    category: { type: String, maxlength: 60, default: 'Misc' },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);
schema.index({ shopId: 1, date: 1 });

module.exports = mongoose.model('Expense', schema);
