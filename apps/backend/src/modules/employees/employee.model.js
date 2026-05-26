const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    employeeNumber: { type: String, required: true, unique: true },
    position: { type: String, required: true }, // e.g. 'caissier', 'superviseur', 'gérant'
    hireDate: { type: Date, default: Date.now },
    salary: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    documents: [
      {
        name: { type: String },
        url: { type: String }
      }
    ],
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Employee', employeeSchema);
