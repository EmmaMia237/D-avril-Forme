// One-time migration script: set isPublished = true for all Category documents that are currently false
// Usage: node migrate-set-category-isPublished-for-live.js

require('dotenv').config();
const { connectDb } = require('./db');
const Category = require('./models/Category');

async function run() {
  try {
    await connectDb();
    console.log('Connected to DB. Scanning categories...');
    const filter = { $or: [ { isPublished: { $exists: false } }, { isPublished: { $ne: true } } ] };
    const update = { $set: { isPublished: true } };
    const res = await Category.updateMany(filter, update);
    const updated = (res && (res.modifiedCount || res.nModified || 0)) || 0;
    console.log(`Migration complete. Documents matched: ${res.matchedCount || res.n || 0}. Documents updated: ${updated}.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  }
}

// Do not run automatically; execute the script manually when ready.
if (require.main === module) run();
