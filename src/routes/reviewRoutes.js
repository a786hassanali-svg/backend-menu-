import express from 'express';
import { submitReview, getReviews } from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Customer submits review (public with orderId validation)
router.post('/', submitReview);

// Admin views reviews
router.get('/', protect, authorize('restaurant_admin', 'manager'), getReviews);

export default router;

