const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Basic public fields
    name: { type: String, trim: true, required: true },
    sku: { type: String, trim: true, index: true },
    category: { type: String, trim: true, required: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number },

    // Inventory & visibility
    stock: { type: Number, default: 0 },
    status: { type: String, trim: true, default: 'Draft' },
    isPublished: { type: Boolean, default: false },

    // Product metadata and presentation
    productType: { type: String, trim: true, enum: ['pre-designed', 'blank'], default: 'pre-designed' },
    // Whether this product is available as a blank/customizable template for the configurator
    is_customizable: { type: Boolean, default: false },
    colors: { type: [String], default: [] },
    // Theme slug for Collections (kids, halloween, autumn, anime)
    theme: {
      type: String,
      trim: true,
      enum: ['kids', 'halloween', 'autumn', 'anime', 'Kids Collection', 'Halloween Collection', 'Fall / Autumn Collection', 'Fall Collection', 'Anime Collection', ''],
      default: '',
    },

    // Images: array of { url, role } where role can be 'front'|'back'|'gallery'|'variant'
    images: {
      type: [
        new mongoose.Schema({ url: String, role: { type: String, trim: true, default: 'gallery' } }, { _id: false }),
      ],
      default: [],
    },

    // Legacy preview paths used by older code
    previewPaths: { type: [String], default: [] },

    // Free-form metadata for extensibility
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
