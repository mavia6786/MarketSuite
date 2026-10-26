const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  salesmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShoeSalesman', required: true },
  date: { type: Date, required: true },
  isPresent: { type: Boolean, default: false },
  checkIn: { type: String, maxlength: 10, default: '' },
  checkOut: { type: String, maxlength: 10, default: '' },
  workingHours: { type: Number, default: 0 },
  notes: { type: String, maxlength: 200, default: '' },
});

// One attendance record per salesman per day (mirrors the unique index in EF)
attendanceSchema.index({ salesmanId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ShoeSalesmanAttendance', attendanceSchema);
