import express from 'express';
import {
  getTables,
  createTable,
  updateTable,
  updateOccupancyStatus,
  regenerateQR,
  downloadQR,
  deleteTable,
} from '../controllers/tableController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getTables);
router.post('/', authorize('restaurant_admin', 'manager'), createTable);
router.put('/:id', authorize('restaurant_admin', 'manager'), updateTable);
router.patch('/:id/occupancy', authorize('restaurant_admin', 'manager', 'waiter', 'cashier'), updateOccupancyStatus);
router.post('/:id/regenerate-qr', authorize('restaurant_admin', 'manager'), regenerateQR);
router.get('/:id/qr-download', downloadQR);
router.delete('/:id', authorize('restaurant_admin'), deleteTable);

export default router;

