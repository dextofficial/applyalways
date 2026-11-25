// Usage: node scripts/seed.js   (creates starter plans if none exist; safe to re-run)
require('dotenv').config();
const mongoose = require('mongoose');
const { Plan, Settings } = require('../src/models');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true });
  if ((await Plan.countDocuments()) === 0) {
    await Plan.insertMany([
      { name: 'Starter Daily', applicationsPerDay: 10, price: 150, durationDays: 1, sortOrder: 1, description: '10 applications today' },
      { name: 'Starter Weekly', applicationsPerDay: 10, price: 900, durationDays: 7, sortOrder: 2, description: '10 applications/day for 7 days' },
      { name: 'Standard Weekly', applicationsPerDay: 20, price: 1600, durationDays: 7, sortOrder: 3, description: '20 applications/day for 7 days' },
      { name: 'Pro Weekly', applicationsPerDay: 30, price: 2200, durationDays: 7, sortOrder: 4, description: '30 applications/day for 7 days' },
      { name: 'Standard Monthly', applicationsPerDay: 20, price: 5500, durationDays: 30, sortOrder: 5, description: '20 applications/day for 30 days' },
      { name: 'Standard Yearly', applicationsPerDay: 20, price: 45000, durationDays: 365, sortOrder: 6, description: '20 applications/day for a full year' },
    ]);
    console.log('Starter plans created. Edit prices in the admin dashboard.');
  } else console.log('Plans already exist, nothing changed.');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
