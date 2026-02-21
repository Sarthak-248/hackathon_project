const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');

async function checkMissedDoses() {
  try {
    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Mark doses as missed if scheduledTime is more than 30 min past and not taken
    await DoseLog.updateMany(
      {
        scheduledTime: { $lt: thirtyMinAgo },
        taken: false,
        missed: false
      },
      { missed: true }
    );
  } catch (err) {
    console.error('Missed dose check error:', err.message);
  }
}

async function checkRefills() {
  try {
    const medicines = await Medicine.find({ isActive: true });
    for (const med of medicines) {
      if (med.pillsRemaining <= 5 && med.pillsRemaining > 0) {
        console.log(`⚠️ Refill alert: ${med.name} has only ${med.pillsRemaining} pills left`);
      }
    }
  } catch (err) {
    console.error('Refill check error:', err.message);
  }
}

module.exports = { checkMissedDoses, checkRefills };
