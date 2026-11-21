import { Product } from '../models/Product.js';

// @desc Get all products for restaurant
// @route GET /api/products
export const getProducts = async (req, res, next) => {
  try {
    const restaurantId = req.user?.restaurantId || req.query.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID required' });
    }

    const { categoryId, isAvailable, isFeatured, search } = req.query;
    const query = { restaurantId };

    if (categoryId && categoryId !== 'all') {
      query.categoryId = categoryId;
    }
    if (isAvailable !== undefined && isAvailable !== '') {
      query.isAvailable = isAvailable === 'true';
    }
    if (isFeatured !== undefined && isFeatured !== '') {
      query.isFeatured = isFeatured === 'true';
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};

// @desc Get single product
// @route GET /api/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @desc Create new product
// @route POST /api/products
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      description,
      images,
      price,
      discountPrice,
      variations,
      addOns,
      ingredients,
      allergens,
      preparationTimeMinutes,
      isAvailable,
      isFeatured,
      stockQuantity,
    } = req.body;

    if (!name || !categoryId || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, Category, and Price are required.',
      });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const product = await Product.create({
      restaurantId: req.user.restaurantId,
      categoryId,
      name: name.trim(),
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      description: description || '',
      images: Array.isArray(images) && images.length ? images : [images || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'],
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : null,
      variations: Array.isArray(variations) ? variations : [],
      addOns: Array.isArray(addOns) ? addOns : [],
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      allergens: Array.isArray(allergens) ? allergens : [],
      preparationTimeMinutes: preparationTimeMinutes ? Number(preparationTimeMinutes) : 15,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      isFeatured: Boolean(isFeatured),
      stockQuantity: stockQuantity !== undefined && stockQuantity !== '' ? Number(stockQuantity) : null,
    });

    res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    next(error);
  }
};

// @desc Update product
// @route PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      categoryId,
      description,
      images,
      price,
      discountPrice,
      variations,
      addOns,
      ingredients,
      allergens,
      preparationTimeMinutes,
      isAvailable,
      isFeatured,
      stockQuantity,
    } = req.body;

    if (name) product.name = name.trim();
    if (categoryId) product.categoryId = categoryId;
    if (description !== undefined) product.description = description;
    if (images !== undefined) product.images = Array.isArray(images) ? images : [images];
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) product.discountPrice = discountPrice ? Number(discountPrice) : null;
    if (variations !== undefined) product.variations = variations;
    if (addOns !== undefined) product.addOns = addOns;
    if (ingredients !== undefined) product.ingredients = ingredients;
    if (allergens !== undefined) product.allergens = allergens;
    if (preparationTimeMinutes !== undefined) product.preparationTimeMinutes = Number(preparationTimeMinutes);
    if (isAvailable !== undefined) product.isAvailable = Boolean(isAvailable);
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity !== '' ? Number(stockQuantity) : null;

    await product.save();

    res.status(200).json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle product availability
// @route PATCH /api/products/:id/availability
export const toggleAvailability = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product is now ${product.isAvailable ? 'available' : 'unavailable'}`,
      isAvailable: product.isAvailable,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete product
// @route DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Product.deleteOne({ _id: product._id });

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

