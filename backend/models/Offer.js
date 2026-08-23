const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    type: { type: String, enum: ['coupon', 'tier', 'bundle'], default: 'coupon' },
    code: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    // base discount if tiers are not used
    discountPercent: { type: Number, default: 0 },
    discountValue: { type: Number, default: 0 },
    minimumQty: { type: Number, default: 0 },
    maxItems: { type: Number, default: 0 },
    // Optional per-code tiers for multi-threshold discounts
    tiers: {
      type: [
        new mongoose.Schema({
          minQty: { type: Number, required: true },
          discountPercent: { type: Number, required: true },
        }, { _id: false })
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    // Optional time window for the offer
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    createdBy: { type: String, trim: true, default: 'admin' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
