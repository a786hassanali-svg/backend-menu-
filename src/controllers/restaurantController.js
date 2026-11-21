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
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: restaurants.length, restaurants });
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

