require('dotenv').config({ path: '../../.env.example' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine-companion';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Medicine.deleteMany({});
  await DoseLog.deleteMany({});

  // Create demo user
  const user = new User({
    name: 'Grandma Sharma',
    email: 'demo@medicine.com',
    password: 'demo1234',
    role: 'elderly',
    caregiverPIN: '1234'
  });
  await user.save();
  console.log('✅ Demo user created (email: demo@medicine.com, password: demo1234, PIN: 1234)');

  // Create demo medicines
  const medicines = [
    {
      userId: user._id,
      name: 'Amlodipine',
      dosage: '5mg',
      frequency: 'daily',
      timeSlots: ['08:00'],
      category: 'Blood Pressure',
      precautions: 'Take at the same time daily. May cause dizziness.',
      refillInterval: 30,
      pillsRemaining: 25
    },
    {
      userId: user._id,
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice_daily',
      timeSlots: ['08:00', '20:00'],
      category: 'Diabetes',
      precautions: 'Take with food. Monitor blood sugar regularly.',
      refillInterval: 30,
      pillsRemaining: 8
    },
    {
      userId: user._id,
      name: 'Atorvastatin',
      dosage: '10mg',
      frequency: 'daily',
      timeSlots: ['21:00'],
      category: 'Cholesterol',
      precautions: 'Take in the evening. Report muscle pain.',
      refillInterval: 30,
      pillsRemaining: 20
    },
    {
      userId: user._id,
      name: 'Ecosprin',
      dosage: '75mg',
      frequency: 'daily',
      timeSlots: ['08:00'],
      category: 'Heart',
      precautions: 'Take with food. Watch for bleeding signs.',
      refillInterval: 30,
      pillsRemaining: 3
    }
  ];

  const savedMeds = [];
  for (const med of medicines) {
    const saved = await new Medicine(med).save();
    savedMeds.push(saved);
  }
  console.log(`✅ ${savedMeds.length} demo medicines created`);

  // Create dose logs for past 7 days
  const now = new Date();
  let logsCreated = 0;
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);

    for (const med of savedMeds) {
      for (const timeSlot of med.timeSlots) {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Randomly mark some as taken, some as missed (for demo)
        const isTodayOrFuture = dayOffset === 0;
        const taken = isTodayOrFuture ? false : Math.random() > 0.2;
        const missed = !taken && !isTodayOrFuture;

        await new DoseLog({
          userId: user._id,
          medicineId: med._id,
          scheduledTime,
          taken,
          missed,
          takenAt: taken ? new Date(scheduledTime.getTime() + Math.random() * 30 * 60000) : null
        }).save();
        logsCreated++;
      }
    }
  }
  console.log(`✅ ${logsCreated} dose logs created`);
  console.log('\n🎉 Seed complete! Login with:');
  console.log('   Email: demo@medicine.com');
  console.log('   Password: demo1234');
  console.log('   Caregiver PIN: 1234');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
