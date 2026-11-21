import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

// @desc Get all categories for restaurant
// @route GET /api/categories
export const getCategories = async (req, res, next) => {
  try {
    const restaurantId = req.user?.restaurantId || req.query.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID required' });
    }

    const categories = await Category.find({ restaurantId }).sort({ displayOrder: 1, name: 1 });
    res.status(200).json({ success: true, count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};

// @desc Create category
// @route POST /api/categories
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, image, displayOrder, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await Category.findOne({
      restaurantId: req.user.restaurantId,
      slug,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category '${name}' already exists in your restaurant.`,
      });
    }

    const category = await Category.create({
      restaurantId: req.user.restaurantId,
      name: name.trim(),
      slug,
      description: description || '',
      image: image || '',
      displayOrder: displayOrder ? Number(displayOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({ success: true, message: 'Category created', category });
  } catch (error) {
    next(error);
  }
};

// @desc Update category
// @route PUT /api/categories/:id
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, image, displayOrder, isActive } = req.body;

    if (name) {
      category.name = name.trim();
      category.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    res.status(200).json({ success: true, message: 'Category updated', category });
  } catch (error) {
    next(error);
  }
};

// @desc Delete category
// @route DELETE /api/categories/:id
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if products exist in category
    const productCount = await Product.countDocuments({ categoryId: category._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category '${category.name}' because it contains ${productCount} product(s). Please move or delete products first.`,
      });
    }

    await Category.deleteOne({ _id: category._id });

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

