const mongoose = require('mongoose');

const clothingSalesmanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    employeeId: { type: String, maxlength: 20, default: '' },
    phone: { type: String, maxlength: 20, default: '' },
    email: { type: String, maxlength: 200, default: '' },
    salary: { type: Number, default: 0 },
    joiningDate: { type: Date, default: Date.now },
    address: { type: String, maxlength: 500, default: '' },
    notes: { type: String, maxlength: 500, default: '' },
    isActive: { type: Boolean, default: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('ClothingSalesman', clothingSalesmanSchema);
