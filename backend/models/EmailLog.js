const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    dedupeKey: { type: String, required: true, unique: true, index: true },
    recipient: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, required: true, trim: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    stripeEventId: { type: String, trim: true, default: null },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    resendEmailId: { type: String, trim: true, default: null },
    sentAt: { type: Date, default: null },
    error: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
