require('dotenv').config();
const { connectDb, mongoose } = require('./db');
const Product = require('./models/Product');

const priceUpdates = [
  { name: 'Blank Tshirt', currentPrice: 12, newPrice: 10.30 },
  { name: 'Coffe Mug', currentPrice: 12, newPrice: 10.30 },
  { name: 'Coffee Mug', currentPrice: 13, newPrice: 11.20 },
  { name: "Kid's Tshirt", currentPrice: 8, newPrice: 6.90 },
  { name: 'T-Shirt', currentPrice: 12, newPrice: 10.30 },
  { name: 'T-Shirt', currentPrice: 14, newPrice: 12.05 },
  { name: 'T-shirt', currentPrice: 14, newPrice: 12.05 },
  { name: 'T-shirt', currentPrice: 13, newPrice: 11.20 },
  { name: 'Tote Bags', currentPrice: 15, newPrice: 12.90 },
  { name: 'Wall Clock', currentPrice: 16, newPrice: 13.75 },
  { name: 'iPhone 12 Pro Max phone Case', currentPrice: 9, newPrice: 7.75 },
];

async function migrate() {
  await connectDb();
  const matches = [];
  for (const update of priceUpdates) {
    const products = await Product.find({ name: update.name, price: update.currentPrice })
      .select('_id name price')
      .lean();
    if (products.length !== 1) {
      throw new Error(`Expected exactly one match for ${update.name} at ${update.currentPrice}, found ${products.length}`);
    }
    matches.push({ ...update, id: String(products[0]._id) });
  }
  console.table(matches);
  for (const match of matches) {
    await Product.updateOne({ _id: match.id, name: match.name, price: match.currentPrice }, { $set: { price: match.newPrice } });
  }
  console.log(`Updated ${matches.length} products.`);
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
