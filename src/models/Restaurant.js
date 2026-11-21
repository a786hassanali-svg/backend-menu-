import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tagline: {
      type: String,
      default: 'Delicious food crafted with love',
    },
    logo: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    currencySymbol: {
      type: String,
      default: 'PKR ',
    },
    taxPercentage: {
      type: Number,
      default: 5.0,
      min: 0,
    },
    serviceChargePercentage: {
      type: Number,
      default: 0.0,
      min: 0,
    },
    openingHours: {
      type: String,
      default: '10:00 AM',
    },
    closingHours: {
      type: String,
      default: '11:00 PM',
    },
    isCurrentlyOpen: {
      type: Boolean,
      default: true,
    },
    location: {
      latitude: {
        type: Number,
        default: 0,
      },
      longitude: {
        type: Number,
        default: 0,
      },
      address: {
        type: String,
        default: '',
      },
    },
    allowedRadiusMeters: {
      type: Number,
      default: 300,
      min: 50,
      max: 5000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnlineOrderingEnabled: {
      type: Boolean,
      default: true,
    },
    isSoundAlertEnabled: {
      type: Boolean,
      default: true,
    },
    autoAcceptOrders: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const Restaurant = mongoose.model('Restaurant', restaurantSchema);

