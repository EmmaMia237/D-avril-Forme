const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    address: { type: String, trim: true, default: null },
    emailOptIn: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    cartItems: [
      {
        productId: { type: String, required: true },
        cartId: { type: String, default: '' },
        name: { type: String, default: '' },
        price: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },
        currency: { type: String, default: 'gbp' },
        image: { type: String, default: '' },
        size: { type: String, default: '' },
        color: { type: String, default: '' },
        customization: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
