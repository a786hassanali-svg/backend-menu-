import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleAvailability,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, () => getProducts(req, res, next));
  }
  getProducts(req, res, next);
});

router.get('/:id', getProductById);

router.post('/', protect, authorize('restaurant_admin', 'manager'), createProduct);
router.put('/:id', protect, authorize('restaurant_admin', 'manager'), updateProduct);
router.patch('/:id/availability', protect, authorize('restaurant_admin', 'manager', 'kitchen_staff'), toggleAvailability);
router.delete('/:id', protect, authorize('restaurant_admin', 'manager'), deleteProduct);

export default router;

