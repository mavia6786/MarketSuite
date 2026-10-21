const mongoose = require('mongoose');

const salesmanSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, default: '' },
  employeeId: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  salary: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now },
  address: { type: String, default: '' },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('ShoeSalesman', salesmanSchema);
