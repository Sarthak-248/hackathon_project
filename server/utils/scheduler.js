try {
  const cron = require('node-cron');
  const Medicine = require('../models/Medicine');
  const DoseLog = require('../models/DoseLog');
  const Notification = require('../models/Notification');

  console.log('Scheduler file loaded');

  async function checkMissedDoses() {
    try {
      const now = new Date();
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
      // Check doses from the last 2 days (covers all timezones)
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const missedDoses = await DoseLog.find({
        scheduledTime: { $gte: twoDaysAgo, $lt: thirtyMinAgo },
        taken: false,
        missed: false
      }).populate('medicineId');

      for (const dose of missedDoses) {
        // Check if a missed_dose notification for this specific dose already exists
        const existing = await Notification.findOne({
          userId: dose.userId,
          type: 'missed_dose',
          medicineId: dose.medicineId._id,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (!existing) {
          // Format scheduled time — scheduler doesn't know user's timezone,
          // so use the medicine's timeSlots for display
          const st = dose.scheduledTime;
          const med = dose.medicineId;
          let timeStr = 'scheduled time';
          if (med.timeSlots && med.timeSlots.length > 0) {
            // Use the original time string from the medicine
            const slot = med.timeSlots[0];
            timeStr = `${slot.time} ${slot.period}`;
          } else {
            // Fallback: display UTC time (may not match local)
            const h = st.getUTCHours();
            const m = st.getUTCMinutes();
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            timeStr = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
          }

          await Notification.create({
            userId: dose.userId,
            type: 'missed_dose',
            title: 'Missed Dose',
            message: `You missed your ${dose.medicineId.name} dose scheduled for ${timeStr}.`,
            severity: 'warning',
            medicineId: dose.medicineId._id,
          });
        }
      }

      // Mark doses as missed if scheduledTime is more than 30 min past and not taken
      await DoseLog.updateMany(
        { _id: { $in: missedDoses.map(d => d._id) } },
        { missed: true }
      );
    } catch (err) {
      console.error('Missed dose check error:', err.message);
    }
  }

  async function checkRefills() {
    try {
      const medicines = await Medicine.find({ isActive: true }).populate('userId');
      for (const med of medicines) {
        if (med.pillsRemaining <= 5 && med.pillsRemaining > 0) {
          // Check if a refill warning for this medicine was already sent in the last 24 hours
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const existingNotification = await Notification.findOne({
            medicineId: med._id,
            type: 'refill_warning',
            createdAt: { $gte: twentyFourHoursAgo },
          });

          if (!existingNotification) {
            console.log(`⚠️ Refill alert: ${med.name} has only ${med.pillsRemaining} pills left`);
            await Notification.create({
              userId: med.userId,
              type: 'refill_warning',
              title: 'Refill Warning',
              message: `${med.name} has only ${med.pillsRemaining} pills left.`,
              severity: 'warning',
              medicineId: med._id,
            });
          }
        }
      }
    } catch (err) {
      console.error('Refill check error:', err.message);
    }
  }

  // Schedule the jobs
  cron.schedule('*/1 * * * *', () => {
    console.log('Running missed dose check...');
    checkMissedDoses();
  });

  cron.schedule('0 9 * * *', () => {
    console.log('Running refill check...');
    checkRefills();
  });

  module.exports = { checkMissedDoses, checkRefills };
} catch (e) {
  console.error('Error loading scheduler.js:', e);
}
