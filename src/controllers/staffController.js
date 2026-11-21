import { User } from '../models/User.js';

// @desc Get all staff members for restaurant
// @route GET /api/staff
export const getStaff = async (req, res, next) => {
  try {
    const staff = await User.find({
      restaurantId: req.user.restaurantId,
      role: { $in: ['manager', 'cashier', 'kitchen_staff', 'waiter'] },
    }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: staff.length, staff });
  } catch (error) {
    next(error);
  }
};

// @desc Add staff member
// @route POST /api/staff
export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, permissions } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const validRoles = ['manager', 'cashier', 'kitchen_staff', 'waiter'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const staff = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone || '',
      role,
      restaurantId: req.user.restaurantId,
      permissions: Array.isArray(permissions) ? permissions : [role],
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        permissions: staff.permissions,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update staff member
// @route PUT /api/staff/:id
export const updateStaff = async (req, res, next) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const { name, phone, role, permissions, isActive, password } = req.body;

    if (name) staff.name = name.trim();
    if (phone !== undefined) staff.phone = phone;
    if (role) staff.role = role;
    if (permissions) staff.permissions = permissions;
    if (isActive !== undefined) staff.isActive = Boolean(isActive);
    if (password) staff.password = password; // Pre-save hook will hash

    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete staff member
// @route DELETE /api/staff/:id
export const deleteStaff = async (req, res, next) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    await User.deleteOne({ _id: staff._id });

    res.status(200).json({ success: true, message: 'Staff member removed successfully' });
  } catch (error) {
    next(error);
  }
};

