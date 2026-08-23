import 'dotenv/config';
import { MongoClient } from 'mongodb';

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
    const res = await db.command({ ping: 1 });
    console.log('DB ping response:', res);
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('DB check failed:', err);
    process.exit(1);
  }
})();
