const express = require('express');
const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');
const router = express.Router();

// Get today's dose logs
router.get('/today', auth, async (req, res) => {
  try {
    // Frontend sends local midnight and end-of-day as ISO strings
    const start = req.query.start ? new Date(req.query.start) : (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();
    const end = req.query.end ? new Date(req.query.end) : (() => { const d = new Date(); d.setUTCHours(23,59,59,999); return d; })();

    const logs = await DoseLog.find({
      userId: req.userId,
      scheduledTime: { $gte: start, $lte: end }
    }).populate('medicineId');

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark dose as taken
router.put('/:id/take', auth, async (req, res) => {
  try {
    const log = await DoseLog.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { taken: true, missed: false, takenAt: new Date() },
      { new: true }
    ).populate('medicineId');

    if (!log) return res.status(404).json({ error: 'Dose log not found' });

    // Decrement pills remaining
    if (log.medicineId) {
      await Medicine.findByIdAndUpdate(log.medicineId._id, { $inc: { pillsRemaining: -1 } });
    }

    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get weekly adherence summary
router.get('/weekly-summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logs = await DoseLog.find({
      userId: req.userId,
      scheduledTime: { $gte: weekAgo, $lte: now }
    }).populate('medicineId');

    const total = logs.length;
    const taken = logs.filter(l => l.taken).length;
    const missed = logs.filter(l => l.missed).length;
    const pending = total - taken - missed;
    const adherencePercent = total > 0 ? Math.round((taken / total) * 100) : 100;

    // Group by medicine
    const byMedicine = {};
    logs.forEach(log => {
      const name = log.medicineId?.name || 'Unknown';
      if (!byMedicine[name]) byMedicine[name] = { total: 0, taken: 0, missed: 0 };
      byMedicine[name].total++;
      if (log.taken) byMedicine[name].taken++;
      if (log.missed) byMedicine[name].missed++;
    });

    // Daily breakdown
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const dayLogs = logs.filter(l => l.scheduledTime >= date && l.scheduledTime < nextDay);
      daily.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        total: dayLogs.length,
        taken: dayLogs.filter(l => l.taken).length,
        missed: dayLogs.filter(l => l.missed).length
      });
    }

    res.json({ total, taken, missed, pending, adherencePercent, byMedicine, daily });
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

// Generate dose logs for a date range
router.post('/generate', auth, async (req, res) => {
  try {
    const timezoneOffset = req.body.timezoneOffset || 0;
    const todayStart = getLocalMidnightUTC(timezoneOffset);

    const medicines = await Medicine.find({ userId: req.userId, isActive: true });
    
    let created = 0;
    for (const medicine of medicines) {
      for (const slot of medicine.timeSlots || []) {
        // timeSlots are objects: { time: "08:00", period: "AM" }
        const [hours, minutes] = slot.time.split(':').map(Number);
        let hours24 = hours;
        if (slot.period === 'PM' && hours < 12) hours24 += 12;
        else if (slot.period === 'AM' && hours === 12) hours24 = 0;

        // todayStart is user's local midnight in UTC; add wall clock hours
        const scheduledTime = new Date(todayStart.getTime() + hours24 * 3600000 + minutes * 60000);

        const exists = await DoseLog.findOne({
          userId: req.userId,
          medicineId: medicine._id,
          scheduledTime
        });

        if (!exists) {
          await new DoseLog({
            userId: req.userId,
            medicineId: medicine._id,
            scheduledTime
          }).save();
          created++;
        }
      }
    }

    res.json({ message: `Generated ${created} dose logs for today` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
