const express = require('express');
const jwt = require('jsonwebtoken');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const auth = require('../middleware/auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'medicine-companion-secret-key';

// Middleware to verify caregiver for sensitive actions
const verifyCaregiverToken = (req, res, next) => {
  const cgToken = req.header('X-Caregiver-Token');
  if (!cgToken) return res.status(403).json({ error: 'Caregiver verification required' });
  try {
    const decoded = jwt.verify(cgToken, JWT_SECRET);
    if (!decoded.caregiverVerified) throw new Error();
    next();
  } catch {
    res.status(403).json({ error: 'Caregiver session expired. Please re-verify PIN.' });
  }
};

// Get all medicines for user
router.get('/', auth, async (req, res) => {
  try {
    const medicines = await Medicine.find({ userId: req.userId, isActive: true }).sort({ createdAt: -1 });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Get midnight of user's local "today" as a UTC Date
function getLocalMidnightUTC(timezoneOffset) {
  const offsetMs = timezoneOffset * 60 * 1000;
  const localTimeMs = Date.now() - offsetMs;
  const midnightLocal = new Date(localTimeMs);
  midnightLocal.setUTCHours(0, 0, 0, 0);
  return new Date(midnightLocal.getTime() + offsetMs);
}

// Add medicine
router.post('/', auth, async (req, res) => {
  try {
    const { timezoneOffset, ...medicineData } = req.body;
    const offset = timezoneOffset || 0;
    const medicine = new Medicine({ ...medicineData, userId: req.userId });
    await medicine.save();

    // Auto-generate dose logs for today using user's local timezone
    const todayStart = getLocalMidnightUTC(offset);
    for (const slot of medicine.timeSlots || []) {
      const [hours, minutes] = slot.time.split(':').map(Number);
      
      let hours24 = hours;
      if (slot.period === 'PM' && hours < 12) {
        hours24 += 12;
      } else if (slot.period === 'AM' && hours === 12) {
        hours24 = 0;
      }
      
      // todayStart is user's local midnight in UTC; add wall clock hours
      const scheduledTime = new Date(todayStart.getTime() + hours24 * 3600000 + minutes * 60000);
      
      await new DoseLog({
        userId: req.userId,
        medicineId: medicine._id,
        scheduledTime
      }).save();
    }

    res.status(201).json(medicine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update medicine (requires caregiver)
router.put('/:id', auth, verifyCaregiverToken, async (req, res) => {
  try {
    const medicine = await Medicine.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete medicine (requires caregiver)
router.delete('/:id', auth, verifyCaregiverToken, async (req, res) => {
  try {
    const medicine = await Medicine.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isActive: false },
      { new: true }
    );
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    res.json({ message: 'Medicine removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get refill alerts
router.get('/refill-alerts', auth, async (req, res) => {
  try {
    const medicines = await Medicine.find({ userId: req.userId, isActive: true });
    const alerts = medicines.filter(m => {
      if (!m.lastRefillDate || !m.refillInterval) return false;
      const nextRefill = new Date(m.lastRefillDate);
      nextRefill.setDate(nextRefill.getDate() + m.refillInterval);
      const daysUntilRefill = Math.ceil((nextRefill - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilRefill <= 5;
    }).map(m => {
      const nextRefill = new Date(m.lastRefillDate);
      nextRefill.setDate(nextRefill.getDate() + m.refillInterval);
      const daysLeft = Math.ceil((nextRefill - new Date()) / (1000 * 60 * 60 * 24));
      return { medicine: m, daysLeft, nextRefillDate: nextRefill };
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
