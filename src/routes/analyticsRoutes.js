import express from 'express';
import {
  getOverviewStats,
  getSalesChart,
  getTopProducts,
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('restaurant_admin', 'manager'));

router.get('/overview', getOverviewStats);
router.get('/sales', getSalesChart);
router.get('/top-products', getTopProducts);

export default router;

