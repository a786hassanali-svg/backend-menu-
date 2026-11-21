import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Allow public to fetch categories if restaurantId is provided in query
router.get('/', (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, () => getCategories(req, res, next));
  }
  getCategories(req, res, next);
});

router.post('/', protect, authorize('restaurant_admin', 'manager'), createCategory);
router.put('/:id', protect, authorize('restaurant_admin', 'manager'), updateCategory);
router.delete('/:id', protect, authorize('restaurant_admin', 'manager'), deleteCategory);

export default router;

