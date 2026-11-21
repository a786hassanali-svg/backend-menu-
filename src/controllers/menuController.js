import { Table } from '../models/Table.js';
import { Restaurant } from '../models/Restaurant.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

// @desc Get public digital menu by unique table QR token
// @route GET /api/menu/:token
export const getMenuByTableToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_REQUIRED',
        message: 'Table token is required',
      });
    }

    // 1. Verify Table Token
    const table = await Table.findOne({ qrToken: token });

    if (!table) {
      return res.status(404).json({
        success: false,
        code: 'INVALID_QR_TOKEN',
        message: 'This QR code is invalid or has expired. Please ask the restaurant staff for an updated QR code.',
      });
    }

    // 2. Verify Table is Active
    if (!table.isActive) {
      return res.status(403).json({
        success: false,
        code: 'TABLE_INACTIVE',
        message: `Table ${table.tableNumber} is currently marked inactive and not accepting orders. Please notify staff.`,
        tableNumber: table.tableNumber,
      });
    }

    // 3. Verify Restaurant
    const restaurant = await Restaurant.findById(table.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Associated restaurant could not be found.',
      });
    }

    if (!restaurant.isActive) {
      return res.status(403).json({
        success: false,
        code: 'RESTAURANT_INACTIVE',
        message: 'This restaurant is temporarily inactive.',
      });
    }

    // Check subscription status
    const now = new Date();
    if (restaurant.subscription?.expiresAt && now > new Date(restaurant.subscription.expiresAt)) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'This restaurant software plan has expired. Please contact management.',
      });
    }

    // 4. Fetch Active Categories
    const categories = await Category.find({
      restaurantId: restaurant._id,
      isActive: true,
    }).sort({ displayOrder: 1, name: 1 });

    // 5. Fetch Available Products
    const products = await Product.find({
      restaurantId: restaurant._id,
      isAvailable: true,
    }).sort({ isFeatured: -1, name: 1 });

    res.status(200).json({
      success: true,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        tagline: restaurant.tagline,
        logo: restaurant.logo,
        coverImage: restaurant.coverImage,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        currency: restaurant.currency,
        currencySymbol: restaurant.currencySymbol,
        taxPercentage: restaurant.taxPercentage,
        serviceChargePercentage: restaurant.serviceChargePercentage,
        isCurrentlyOpen: restaurant.isCurrentlyOpen,
        openingHours: restaurant.openingHours,
        closingHours: restaurant.closingHours,
        isOnlineOrderingEnabled: restaurant.isOnlineOrderingEnabled,
        location: restaurant.location,
        allowedRadiusMeters: restaurant.allowedRadiusMeters,
      },
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        name: table.name,
        capacity: table.capacity,
        occupancyStatus: table.occupancyStatus,
      },
      categories,
      products,
    });
  } catch (error) {
    next(error);
  }
};

