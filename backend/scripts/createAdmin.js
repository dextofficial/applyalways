// Usage: node scripts/createAdmin.js "Your Name" you@email.com YourStrongPassword
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../src/models');

(async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.log('Usage: node scripts/createAdmin.js "Name" email password');
    process.exit(1);
  }
  if (password.length < 8) {
    console.log('Password must be at least 8 characters');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log('Updated existing account to admin:', email);
  } else {
    await User.create({ name, email, passwordHash, role: 'admin' });
    console.log('Admin created:', email);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
