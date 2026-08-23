const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    sessionId: { type: String, trim: true, required: true, unique: true },
    trackingNumber: { type: String, trim: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userEmail: { type: String, trim: true, lowercase: true, default: null },
    userName: { type: String, trim: true, default: null },
    paymentMethod: { type: String, trim: true, default: 'Stripe' },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, trim: true, default: 'Payment Pending' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
