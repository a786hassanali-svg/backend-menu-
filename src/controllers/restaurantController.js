import { Restaurant } from '../models/Restaurant.js';

// @desc Get current restaurant details
// @route GET /api/restaurants/my
export const getMyRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    res.status(200).json({ success: true, restaurant });
  } catch (error) {
    next(error);
  }
};

// @desc Update restaurant settings
// @route PUT /api/restaurants/settings
export const updateRestaurantSettings = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const {
      name,
      tagline,
      logo,
      coverImage,
      address,
      phone,
      email,
      currency,
      currencySymbol,
      taxPercentage,
      serviceChargePercentage,
      openingHours,
      closingHours,
      isCurrentlyOpen,
      location,
      allowedRadiusMeters,
      isOnlineOrderingEnabled,
      isSoundAlertEnabled,
      autoAcceptOrders,
    } = req.body;

    if (name) restaurant.name = name;
    if (tagline !== undefined) restaurant.tagline = tagline;
    if (logo !== undefined) restaurant.logo = logo;
    if (coverImage !== undefined) restaurant.coverImage = coverImage;
    if (address !== undefined) restaurant.address = address;
    if (phone !== undefined) restaurant.phone = phone;
    if (email !== undefined) restaurant.email = email;
    if (currency) restaurant.currency = currency;
    if (currencySymbol) restaurant.currencySymbol = currencySymbol;
    if (taxPercentage !== undefined) restaurant.taxPercentage = Number(taxPercentage);
    if (serviceChargePercentage !== undefined) restaurant.serviceChargePercentage = Number(serviceChargePercentage);
    if (openingHours) restaurant.openingHours = openingHours;
    if (closingHours) restaurant.closingHours = closingHours;
    if (isCurrentlyOpen !== undefined) restaurant.isCurrentlyOpen = Boolean(isCurrentlyOpen);
    if (isOnlineOrderingEnabled !== undefined) restaurant.isOnlineOrderingEnabled = Boolean(isOnlineOrderingEnabled);
    if (isSoundAlertEnabled !== undefined) restaurant.isSoundAlertEnabled = Boolean(isSoundAlertEnabled);
    if (autoAcceptOrders !== undefined) restaurant.autoAcceptOrders = Boolean(autoAcceptOrders);

    if (allowedRadiusMeters !== undefined) {
      restaurant.allowedRadiusMeters = Math.max(50, Number(allowedRadiusMeters));
    }

    if (location) {
      restaurant.location = {
        latitude: location.latitude !== undefined ? Number(location.latitude) : restaurant.location.latitude,
        longitude: location.longitude !== undefined ? Number(location.longitude) : restaurant.location.longitude,
        address: location.address || restaurant.location.address,
      };
    }

    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'Restaurant settings updated successfully',
      restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get public restaurant info by slug
// @route GET /api/restaurants/:slug
export const getRestaurantBySlug = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found or inactive' });
    }
    res.status(200).json({ success: true, restaurant });
  } catch (error) {
    next(error);
  }
};

// @desc Get all restaurants (Super Admin)
// @route GET /api/restaurants
export const getAllRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find()
      .populate('createdBy', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: restaurants.length, restaurants });
  } catch (error) {
    next(error);
  }
};

// @desc Create new restaurant with 1-month plan & assign Admin (Super Admin)
// @route POST /api/restaurants/create-new
export const createRestaurantBySuperAdmin = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      phone,
      address,
      adminName,
      adminEmail,
      adminPassword,
      durationDays = 30,
      subscriptionPrice = 0,
    } = req.body;

    if (!name || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant Name, Admin Email, and Admin Password are required.',
      });
    }

    const { User } = await import('../models/User.js');

    // Check if email already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this admin email already exists.',
      });
    }

    // Auto generate slug if not provided
    const baseSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Restaurant.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const days = Number(durationDays) || 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const restaurant = await Restaurant.create({
      name,
      slug: uniqueSlug,
      phone: phone || '',
      address: address || '',
      subscription: {
        status: 'active',
        plan: `${days} Days Plan`,
        startDate: new Date(),
        expiresAt,
        price: Number(subscriptionPrice) || 0,
      },
    });

    const user = await User.create({
      name: adminName || `${name} Admin`,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      phone: phone || '',
      role: 'restaurant_admin',
      restaurantId: restaurant._id,
      permissions: ['all'],
    });

    restaurant.createdBy = user._id;
    await restaurant.save();

    res.status(201).json({
      success: true,
      message: `Restaurant created successfully with ${days} days active plan!`,
      restaurant,
      adminUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Renew / Extend Restaurant Subscription by Days (Super Admin)
// @route POST /api/restaurants/:id/renew
export const renewRestaurantSubscription = async (req, res, next) => {
  try {
    const { days = 30 } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const numDays = Number(days) || 30;
    const now = new Date();
    
    // If currently already active and not expired yet, extend from current expiry date.
    // If already expired, extend from today.
    let baseDate = now;
    if (restaurant.subscription?.expiresAt && new Date(restaurant.subscription.expiresAt) > now) {
      baseDate = new Date(restaurant.subscription.expiresAt);
    }

    const newExpiry = new Date(baseDate.getTime() + numDays * 24 * 60 * 60 * 1000);

    if (!restaurant.subscription) {
      restaurant.subscription = {};
    }

    restaurant.subscription.status = 'active';
    restaurant.subscription.expiresAt = newExpiry;
    restaurant.isActive = true; // Auto re-activate if it was inactive

    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Subscription successfully renewed for ${numDays} days! New Expiry: ${newExpiry.toLocaleDateString()}`,
      restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle active status of restaurant (Super Admin)
// @route PATCH /api/restaurants/:id/status
export const toggleRestaurantStatus = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();
    res.status(200).json({
      success: true,
      message: `Restaurant ${restaurant.isActive ? 'activated' : 'deactivated'} successfully`,
      restaurant,
    });
  } catch (error) {
    next(error);
  }
};

