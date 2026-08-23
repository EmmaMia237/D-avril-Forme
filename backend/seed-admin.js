require('dotenv').config();
const { connectDb, mongoose } = require('./db');
const { hashPassword } = require('./auth');
const User = require('./models/User');

async function seed() {
  await connectDb();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPass = process.env.ADMIN_PASS || 'changeme123';

  const existing = await User.findOne({ email: adminEmail }).lean();
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    return;
  }

  const passwordHash = await hashPassword(adminPass);
  const admin = await User.create({
    name: 'Owner',
    email: adminEmail,
    passwordHash,
    role: 'admin',
  });

  console.log('Admin seeded:', adminEmail, 'id:', String(admin._id));
  console.log('Use these admin credentials:');
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPass}`);
}

seed()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await mongoose.connection.close();
    process.exit(1);
  });
