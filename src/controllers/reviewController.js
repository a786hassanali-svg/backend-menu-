import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';

// @desc Submit customer review for delivered order
// @route POST /api/reviews
export const submitReview = async (req, res, next) => {
  try {
    const { orderId, rating, foodQualityRating, serviceRating, comment, customerName } = req.body;

    if (!orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and overall rating (1-5) are required.',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if order was delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted after your order has been delivered.',
      });
    }

    // Check if already reviewed
    const existing = await Review.findOne({ orderId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback for this order. Thank you!',
      });
    }

    const review = await Review.create({
      restaurantId: order.restaurantId,
      orderId: order._id,
      customerName: customerName || order.customer?.name || 'Guest',
      rating: Math.min(5, Math.max(1, Number(rating))),
      foodQualityRating: foodQualityRating ? Math.min(5, Math.max(1, Number(foodQualityRating))) : 5,
      serviceRating: serviceRating ? Math.min(5, Math.max(1, Number(serviceRating))) : 5,
      comment: comment ? comment.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your review!',
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get reviews for restaurant
// @route GET /api/reviews
export const getReviews = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurantId;
    const reviews = await Review.find({ restaurantId })
      .populate('orderId', 'orderNumber tableNumber')
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10
      : 5;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: avgRating,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

