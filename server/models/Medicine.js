const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  dosage: { type: String, required: true },
  frequency: { type: String, enum: ['daily', 'twice_daily', 'thrice_daily', 'weekly', 'as_needed'], default: 'daily' },
  timeSlots: [{ type: String }], // ["08:00", "20:00"]
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  refillInterval: { type: Number, default: 30 }, // days
  lastRefillDate: { type: Date, default: Date.now },
  precautions: { type: String },
  category: { type: String }, // "BP", "Diabetes", etc.
  pillsRemaining: { type: Number, default: 30 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Medicine', medicineSchema);
