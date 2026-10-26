const mongoose = require('mongoose');

const clothingAttendanceSchema = new mongoose.Schema({
  clothingSalesmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingSalesman', required: true },
  date: { type: Date, required: true },
  isPresent: { type: Boolean, default: false },
  checkIn: { type: String, maxlength: 10, default: '' },
  checkOut: { type: String, maxlength: 10, default: '' },
  workingHours: { type: Number, default: 0 },
  notes: { type: String, maxlength: 200, default: '' },
});

clothingAttendanceSchema.virtual('statusLabel').get(function () {
  return this.isPresent ? 'Present' : 'Absent';
});
clothingAttendanceSchema.virtual('workingHoursLabel').get(function () {
  return this.workingHours > 0 ? `${this.workingHours.toFixed(1)} hrs` : '—';
});
clothingAttendanceSchema.set('toJSON', { virtuals: true });
clothingAttendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ClothingSalesmanAttendance', clothingAttendanceSchema);
