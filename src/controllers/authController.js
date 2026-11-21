import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc Register a new restaurant admin
// @route POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, restaurantName } = req.body;

    if (!name || !email || !password || !restaurantName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and restaurant name',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Generate unique slug
    let slug = restaurantName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingRestaurant = await Restaurant.findOne({ slug });
    if (existingRestaurant) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Create Restaurant
    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      email,
      phone: phone || '',
      currency: 'USD',
      currencySymbol: '$',
      taxPercentage: 5,
      allowedRadiusMeters: 300,
    });

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: 'restaurant_admin',
      restaurantId: restaurant._id,
      permissions: ['all'],
    });

    restaurant.createdBy = user._id;
    await restaurant.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: restaurant._id,
        restaurant,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Login user
// @route POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.',
      });
    }

    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await Restaurant.findById(user.restaurantId);
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        restaurantId: user.restaurantId,
        restaurant,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await Restaurant.findById(user.restaurantId);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        restaurantId: user.restaurantId,
        restaurant,
      },
    });
  } catch (error) {
    next(error);
  }
};

