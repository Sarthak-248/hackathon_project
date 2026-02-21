const express = require('express');
const Notification = require('../models/Notification');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const auth = require('../middleware/auth');
const router = express.Router();

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
      if (!log.taken && !log.missed) {
        const scheduled = new Date(log.scheduledTime);
        const minPast = (now - scheduled) / 60000;
        if (minPast > 30) {
          // Mark as missed
          await DoseLog.findByIdAndUpdate(log._id, { missed: true });
          const med = log.medicineId;
          if (med && !(await alreadyNotified('missed_dose', med._id))) {
            await createNotif({
              type: 'missed_dose', severity: 'error',
              title: '❌ Missed Dose',
              message: `${med.name} (${med.dosage}) was due at ${scheduled.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} but was not taken. Take it now if safe to do so.`,
              medicineId: med._id,
              metadata: { scheduledTime: scheduled, dosage: med.dosage }
            });
          }
        }
      }
    }

    // ── 2. OVERDUE / NOT TAKEN TODAY (past schedule time but not yet 30 min) ──
    for (const log of todayLogs) {
      if (!log.taken && !log.missed) {
        const scheduled = new Date(log.scheduledTime);
        const minPast = (now - scheduled) / 60000;
        if (minPast > 5 && minPast <= 30) {
          const med = log.medicineId;
          if (med && !(await alreadyNotified('schedule_reminder', med._id))) {
            await createNotif({
              type: 'schedule_reminder', severity: 'warning',
              title: '⏰ Dose Overdue',
              message: `${med.name} (${med.dosage}) was scheduled at ${scheduled.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}. Please take it now!`,
              medicineId: med._id,
              expiresAt: new Date(Date.now() + 86400000)
            });
          }
        }
      }
    }

    // ── 3. LOW STOCK / REFILL ALERTS ──
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

    // ── 4. PENDING DOSES TODAY ──
    const pendingCount = todayLogs.filter(l => !l.taken && !l.missed).length;
    if (pendingCount > 0 && !(await alreadyNotified('schedule_reminder'))) {
      await createNotif({
        type: 'schedule_reminder', severity: 'info',
        title: '🔔 Doses Pending Today',
        message: `You have ${pendingCount} dose${pendingCount > 1 ? 's' : ''} remaining for today. Stay on schedule!`,
        expiresAt: new Date(Date.now() + 86400000)
      });
    }

    // ── 5. ALL DONE TODAY ──
    const allDone = todayLogs.length > 0 && todayLogs.every(l => l.taken || l.missed);
    const takenCount = todayLogs.filter(l => l.taken).length;
    if (allDone && takenCount > 0 && !(await alreadyNotified('all_done'))) {
      await createNotif({
        type: 'all_done', severity: 'success',
        title: '🎉 All Doses Complete!',
        message: `Amazing! You took ${takenCount} out of ${todayLogs.length} doses today. Great job!`,
        expiresAt: new Date(Date.now() + 86400000)
      });
    }

    // ── 6. ADHERENCE STREAK (3+ days perfect) ──
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    const recentLogs = await DoseLog.find({ userId, scheduledTime: { $gte: threeDaysAgo, $lt: todayStart } });
    if (recentLogs.length >= 3 && recentLogs.every(l => l.taken) && !(await alreadyNotified('streak'))) {
      await createNotif({
        type: 'streak', severity: 'success',
        title: '🔥 3-Day Streak!',
        message: "You've taken every dose for the past 3 days. Keep the streak going!"
      });
    }

    // Fetch full notification list to return
    const all = await Notification.find({ userId }).populate('medicineId', 'name dosage category').sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({ generated: created.length, notifications: all, unreadCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
