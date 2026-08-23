import 'dotenv/config';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set');
      process.exit(2);
    }
    const client = new MongoClient(uri);
    await client.connect();
    const dbName = process.env.MONGODB_DB ?? 'avril-forme';
    const db = client.db(dbName);

    const email = 'leslie@gmail.com';
    const password = '12345678';
    const name = 'Leslie Admin';

    const users = db.collection('users');
    const existing = await users.findOne({ email: email.toLowerCase() });
    const hash = await bcrypt.hash(password, 10);
    if (existing) {
      await users.updateOne({ _id: existing._id }, { $set: { passwordHash: hash, role: 'admin', name, updatedAt: new Date() } });
      console.log('Updated existing user to admin:', email);
    } else {
      const res = await users.insertOne({ email: email.toLowerCase(), passwordHash: hash, role: 'admin', name, createdAt: new Date() });
      console.log('Created admin user with id:', res.insertedId.toString());
    }

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
})();
