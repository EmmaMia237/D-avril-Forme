import 'dotenv/config';
import { MongoClient } from 'mongodb';

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(2);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB ?? 'avril-forme');
    const col = db.collection('products');
    console.log('Inserting test product...');
    const res = await col.insertOne({ name: 'TEST PRODUCT ' + Date.now(), price: 9.99, category: 'Test', createdAt: new Date() });
    console.log('Inserted id:', res.insertedId.toString());
    const id = res.insertedId;
    console.log('Reading product...');
    const p = await col.findOne({ _id: id });
    console.log('Product:', p);
    console.log('Updating product price...');
    await col.updateOne({ _id: id }, { $set: { price: 11.99 } });
    const p2 = await col.findOne({ _id: id });
    console.log('Updated product:', p2);
    console.log('Deleting product...');
    await col.deleteOne({ _id: id });
    console.log('Deleted. Verifying...');
    const p3 = await col.findOne({ _id: id });
    console.log('After delete, found:', p3);
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Product CRUD failed:', err);
    await client.close();
    process.exit(1);
  }
})();
