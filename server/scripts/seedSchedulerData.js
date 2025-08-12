// MongoDB seed script for league scheduler admin and teams
// Usage: Run with `node server/scripts/seedSchedulerData.js` (after adjusting for your environment)
// NOTE: For production, always use the registration endpoint to hash passwords properly!

const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/acpl';

async function seed() {
  await mongoose.connect(MONGODB_URI);

  // 1. Create NBA admin user (password will be hashed by the model's pre-save hook)
  const admin = new User({
    email: 'nboakyeakyeampong@gmail.com',
    password: 'Blacklip$10',
    username: 'NBA',
  });
  await admin.save();
  console.log('Admin user NBA created.');

  // 2. Insert 6 teams
  const teams = [
    { name: 'Dragons', code: 'DRA', crestUrl: '/assets/images/dragons-logo.png' },
    { name: 'Vikings', code: 'VIK', crestUrl: '/assets/images/vikings-logo.png' },
    { name: 'Warriors', code: 'WAR', crestUrl: '/assets/images/warriors-logo.png' },
    { name: 'Lions', code: 'LIO', crestUrl: '/assets/images/lions-logo.png' },
    { name: 'Elites', code: 'ELI', crestUrl: '/assets/images/elites-logo.png' },
    { name: 'Falcons', code: 'FAL', crestUrl: '/assets/images/falcons-logo.png' },
  ];
  await Team.insertMany(teams);
  console.log('6 teams inserted.');

  await mongoose.disconnect();
  console.log('Seeding complete.');
}

seed().catch(err => {
  console.error('Seeding error:', err);
  mongoose.disconnect();
}); 