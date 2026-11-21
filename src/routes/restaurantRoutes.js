import express from 'express';
import {
  getMyRestaurant,
  updateRestaurantSettings,
  getRestaurantBySlug,
  getAllRestaurants,
  toggleRestaurantStatus,
} from '../controllers/restaurantController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route to view restaurant by slug
router.get('/public/:slug', getRestaurantBySlug);

// Protected routes for restaurant admin
router.get('/my', protect, getMyRestaurant);
router.put('/settings', protect, authorize('restaurant_admin', 'manager'), updateRestaurantSettings);

// Super admin routes
router.get('/', protect, authorize('super_admin'), getAllRestaurants);
router.patch('/:id/status', protect, authorize('super_admin'), toggleRestaurantStatus);

export default router;

