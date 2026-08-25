const mongoose = require('mongoose');

const customItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true },
    title: { type: String },
    sku: { type: String },
    category: { type: String },
    selectedColor: { type: String },
    selectedSize: { type: String },
    totalPrice: { type: Number },
    customizations: { type: mongoose.Schema.Types.Mixed },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.models.CustomItem || mongoose.model('CustomItem', customItemSchema);
