import express from 'express';
import { getMenuByTableToken } from '../controllers/menuController.js';

const router = express.Router();

// Public route: customer scans QR code and loads menu
router.get('/:token', getMenuByTableToken);

export default router;

