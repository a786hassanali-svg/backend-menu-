import { Restaurant } from '../models/Restaurant.js';

/**
 * Middleware to check if the restaurant associated with the request has an active subscription.
 * Skips check for super_admin.
 */
export const checkSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Super Admin has unrestricted access to everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!req.user.restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'No restaurant associated with this user account.',
      });
    }

    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant profile not found.',
      });
    }

    const now = new Date();
    const expiryDate = restaurant.subscription?.expiresAt
      ? new Date(restaurant.subscription.expiresAt)
      : null;

    // Check if subscription has expired
    if (!expiryDate || now > expiryDate) {
      if (restaurant.subscription && restaurant.subscription.status !== 'expired') {
        restaurant.subscription.status = 'expired';
        await restaurant.save();
      }

      return res.status(403).json({
        success: false,
        isSubscriptionExpired: true,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your 1-month software subscription has expired. Please contact super admin to renew your account.',
        expiresAt: expiryDate,
      });
    }

    // Attach active restaurant to req
    req.restaurant = restaurant;
    next();
  } catch (error) {
    next(error);
  }
};
