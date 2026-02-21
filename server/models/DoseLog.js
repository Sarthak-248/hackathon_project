const mongoose = require('mongoose');

const doseLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  scheduledTime: { type: Date, required: true },
  taken: { type: Boolean, default: false },
  missed: { type: Boolean, default: false },
  takenAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DoseLog', doseLogSchema);
