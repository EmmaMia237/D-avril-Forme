const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    address: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
