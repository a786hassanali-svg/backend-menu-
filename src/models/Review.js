import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // Prevent multiple reviews for same order
      index: true,
    },
    customerName: {
      type: String,
      default: 'Guest',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    foodQualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    serviceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    comment: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Review = mongoose.model('Review', reviewSchema);

