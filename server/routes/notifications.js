const express = require('express');
const Notification = require('../models/Notification');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const auth = require('../middleware/auth');
const router = express.Router();

// Format a UTC date as HH:MM AM/PM in user's local time
function formatTimeLocal(date, timezoneOffset) {
  // timezoneOffset is in minutes (e.g. -330 for IST)
  // Convert UTC to local: local = UTC - offset
  const localMs = date.getTime() - (timezoneOffset || 0) * 60 * 1000;
  const local = new Date(localMs);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// ── GET all notifications for this user ──
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .populate('medicineId', 'name dosage category')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET unread count (for bell badge) ──
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Mark one as read ──
router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { read: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Mark all as read ──
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Delete one ──
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Clear all read ──
router.post('/clear-read', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({ userId: req.userId, read: true });
    res.json({ deleted: result.deletedCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// SMART NOTIFICATION GENERATOR — called on dashboard load
// Scans medicines, dose logs, stock levels and generates
// relevant notifications for THIS user only
// ═══════════════════════════════════════════════════════
router.post('/generate', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const timezoneOffset = req.body.timezoneOffset || 0;
    const now = new Date();
    const todayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // last 24 hours for dedup
    const todayEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24 hours
    const created = [];

    // Helper: don't create duplicate notifs of same type+medicine in last 24h
    async function alreadyNotified(type, medicineId) {
      const q = { userId, type, createdAt: { $gte: todayStart } };
      if (medicineId) q.medicineId = medicineId;
      return !!(await Notification.findOne(q));
    }

    async function createNotif(data) {
      const n = await new Notification({ userId, expiresAt: new Date(Date.now() + 7 * 86400000), ...data }).save();
      created.push(n);
      return n;
    }

    const medicines = await Medicine.find({ userId, isActive: true });
    const todayLogs = await DoseLog.find({ userId, scheduledTime: { $gte: todayStart, $lte: todayEnd } }).populate('medicineId');

    // ── 1. MISSED DOSE ALERTS ──
    for (const log of todayLogs) {
      if (!log.taken) {
        const scheduled = new Date(log.scheduledTime);
        const minPast = (now - scheduled) / 60000;
        // Already marked missed (by scheduler/creation) OR newly missed (>30 min overdue)
        if (log.missed || minPast > 30) {
          // Mark as missed if not already
          if (!log.missed) {
            await DoseLog.findByIdAndUpdate(log._id, { missed: true });
          }
          const med = log.medicineId;
          if (med && !(await alreadyNotified('missed_dose', med._id))) {
            await createNotif({
              type: 'missed_dose', severity: 'error',
              title: '❌ Missed Dose',
              message: `${med.name} (${med.dosage}) was due at ${formatTimeLocal(scheduled, timezoneOffset)} but was not taken. Take it now if safe to do so.`,
              medicineId: med._id,
              metadata: { scheduledTime: scheduled, dosage: med.dosage }
            });
          }
        }
      }
    }

    // ── 2. REFILL / LOW STOCK ALERTS ──
    for (const med of medicines) {
      if (med.pillsRemaining <= 0 && !(await alreadyNotified('refill_urgent', med._id))) {
        await createNotif({
          type: 'refill_urgent', severity: 'error',
          title: '🚨 Out of Stock!',
          message: `${med.name} has 0 pills remaining. Get a refill immediately to avoid missing doses!`,
          medicineId: med._id, metadata: { pillsRemaining: 0 }
        });
      } else if (med.pillsRemaining > 0 && med.pillsRemaining <= 3 && !(await alreadyNotified('refill_urgent', med._id))) {
        await createNotif({
          type: 'refill_urgent', severity: 'error',
          title: '🚨 Critically Low Stock',
          message: `${med.name} has only ${med.pillsRemaining} pill${med.pillsRemaining > 1 ? 's' : ''} left! Refill urgently.`,
          medicineId: med._id, metadata: { pillsRemaining: med.pillsRemaining }
        });
      } else if (med.pillsRemaining > 3 && med.pillsRemaining <= 7 && !(await alreadyNotified('low_stock', med._id))) {
        await createNotif({
          type: 'low_stock', severity: 'warning',
          title: '📦 Low Stock Warning',
          message: `${med.name} has ${med.pillsRemaining} pills remaining. Plan a refill soon.`,
          medicineId: med._id, metadata: { pillsRemaining: med.pillsRemaining }
        });
      }

      // Refill date approaching
      if (med.lastRefillDate && med.refillInterval) {
        const nextRefill = new Date(med.lastRefillDate);
        nextRefill.setDate(nextRefill.getDate() + med.refillInterval);
        const daysLeft = Math.ceil((nextRefill - now) / 86400000);
        if (daysLeft <= 3 && daysLeft > 0 && !(await alreadyNotified('refill_warning', med._id))) {
          await createNotif({
            type: 'refill_warning', severity: 'warning',
            title: '📅 Refill Due Soon',
            message: `${med.name} refill due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Visit pharmacy soon.`,
            medicineId: med._id, metadata: { daysLeft }
          });
        }
      }
    }

    // Fetch full notification list to return
    const all = await Notification.find({ userId }).populate('medicineId', 'name dosage category').sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({ generated: created.length, notifications: all, unreadCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
