const mongoose = require('mongoose');

const clothingSalaryRecordSchema = new mongoose.Schema({
  clothingSalesmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingSalesman', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
  amountPaid: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  bonusNote: { type: String, maxlength: 500, default: '' },
  paymentNote: { type: String, maxlength: 500, default: '' },
  paidAt: { type: Date, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

clothingSalaryRecordSchema.index({ clothingSalesmanId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('ClothingSalaryRecord', clothingSalaryRecordSchema);
