import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  trackOrderCustomer,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public customer routes
router.post('/', createOrder);
router.get('/track/:token', trackOrderCustomer);

// Protected routes for restaurant dashboard & staff
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.patch(
  '/:id/status',
  protect,
  authorize('restaurant_admin', 'manager', 'cashier', 'kitchen_staff', 'waiter'),
  updateOrderStatus
);

export default router;

