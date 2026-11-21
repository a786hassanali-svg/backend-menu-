import mongoose from 'mongoose';

const variationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Small", "Medium", "Large"
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const addOnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Extra Cheese", "Jalapenos"
    price: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    images: [
      {
        type: String,
      },
    ],
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    discountPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    variations: [variationSchema],
    addOns: [addOnSchema],
    ingredients: [
      {
        type: String,
      },
    ],
    allergens: [
      {
        type: String,
      },
    ],
    preparationTimeMinutes: {
      type: Number,
      default: 15,
      min: 1,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    stockQuantity: {
      type: Number,
      default: null, // null means unlimited
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ restaurantId: 1, slug: 1 }, { unique: true });
productSchema.index({ restaurantId: 1, isAvailable: 1 });

export const Product = mongoose.model('Product', productSchema);

