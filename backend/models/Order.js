const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: '' },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
    customization: { type: mongoose.Schema.Types.Mixed, default: null },
    size: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    sessionId: { type: String, trim: true, required: true, unique: true },
    trackingNumber: { type: String, trim: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userEmail: { type: String, trim: true, lowercase: true, default: null },
    userName: { type: String, trim: true, default: null },
    paymentMethod: { type: String, trim: true, default: 'Stripe' },
    items: { type: [orderItemSchema], default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, trim: true, default: 'Payment Pending' },
    paymentStatus: { type: String, trim: true, default: 'pending' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
