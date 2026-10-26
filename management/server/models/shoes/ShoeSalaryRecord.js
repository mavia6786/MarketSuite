const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    salesmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShoeSalesman', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    amountPaid: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    bonusNote: { type: String, maxlength: 500, default: '' },
    paymentNote: { type: String, maxlength: 500, default: '' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);
schema.index({ salesmanId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('ShoeSalaryRecord', schema);
