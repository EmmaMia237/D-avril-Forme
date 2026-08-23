const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, trim: true, required: true, unique: true },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    isPublished: { type: Boolean, default: false },
    items: { type: Number, default: 0 },
    createdBy: { type: String, trim: true, default: 'admin' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
