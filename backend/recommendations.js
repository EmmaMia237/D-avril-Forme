const Order = require('./models/Order');
const Product = require('./models/Product');

async function getRecommendationsForUser(userId, limit = 4) {
  const orders = await Order.find({ userId }).select('items').lean();
  const purchasedIds = [...new Set(orders.flatMap((order) => (order.items || []).map((item) => String(item.productId || '')).filter(Boolean)))];
  if (!purchasedIds.length) return Product.find({ isPublished: true }).sort({ createdAt: -1 }).limit(limit).lean();

  const purchasedProducts = await Product.find({ _id: { $in: purchasedIds } }).select('category theme').lean();
  const categories = [...new Set(purchasedProducts.map((product) => product.category).filter(Boolean))];
  const themes = [...new Set(purchasedProducts.map((product) => product.theme).filter(Boolean))];
  return Product.find({
    isPublished: true,
    _id: { $nin: purchasedIds },
    $or: [{ category: { $in: categories } }, { theme: { $in: themes } }],
  }).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = { getRecommendationsForUser };
