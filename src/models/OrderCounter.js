import mongoose from 'mongoose';

const orderCounterSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

orderCounterSchema.index({ restaurantId: 1, year: 1 }, { unique: true });

/**
 * Concurrency-safe atomic increment for generating unique order numbers per restaurant per year
 * Format: ORD-YYYY-00001
 */
orderCounterSchema.statics.getNextOrderNumber = async function (restaurantId) {
  const currentYear = new Date().getFullYear();

  const counter = await this.findOneAndUpdate(
    { restaurantId, year: currentYear },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `ORD-${currentYear}-${paddedSeq}`;
};

export const OrderCounter = mongoose.model('OrderCounter', orderCounterSchema);

