import { Order } from '../models/Order.js';
import { Table } from '../models/Table.js';
import { Restaurant } from '../models/Restaurant.js';
import { Product } from '../models/Product.js';
import { OrderCounter } from '../models/OrderCounter.js';
import { validateCustomerProximity } from '../utils/geo.js';
import { emitNewOrder, emitOrderStatusUpdate, emitTableStatusUpdate } from '../sockets/socketManager.js';

// @desc Place new order from customer digital menu
// @route POST /api/orders
export const createOrder = async (req, res, next) => {
  try {
    const {
      qrToken,
      customerName,
      customerPhone,
      customerLocation,
      items,
      paymentMethod = 'cash_at_table',
      specialNotes,
      idempotencyKey,
    } = req.body;

    // Idempotency check: if order with this idempotency key already exists, return it
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });
      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message: 'Order already submitted',
          order: existingOrder,
          isDuplicate: true,
        });
      }
    }

    // 1. Verify QR Token & Table
    if (!qrToken) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_QR_TOKEN',
        message: 'A valid table QR token is required to place an order.',
      });
    }

    const table = await Table.findOne({ qrToken });
    if (!table) {
      return res.status(404).json({
        success: false,
        code: 'INVALID_QR_TOKEN',
        message: 'Table QR code is invalid or expired.',
      });
    }

    if (!table.isActive) {
      return res.status(403).json({
        success: false,
        code: 'TABLE_INACTIVE',
        message: `Table ${table.tableNumber} is currently inactive and cannot accept orders.`,
      });
    }

    // 2. Verify Restaurant
    const restaurant = await Restaurant.findById(table.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(403).json({
        success: false,
        code: 'RESTAURANT_INACTIVE',
        message: 'This restaurant is currently not active.',
      });
    }

    // Check subscription status
    const now = new Date();
    if (restaurant.subscription?.expiresAt && now > new Date(restaurant.subscription.expiresAt)) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Ordering is temporarily paused as the restaurant subscription has expired.',
      });
    }

    if (!restaurant.isOnlineOrderingEnabled) {
      return res.status(403).json({
        success: false,
        code: 'ORDERING_DISABLED',
        message: 'Digital ordering is temporarily disabled by the restaurant.',
      });
    }

    if (!restaurant.isCurrentlyOpen) {
      return res.status(403).json({
        success: false,
        code: 'RESTAURANT_CLOSED',
        message: `The restaurant is currently closed (Hours: ${restaurant.openingHours} - ${restaurant.closingHours}).`,
      });
    }

    // 3. Geofencing Validation (Server-Side 300-meter proximity verification)
    const proximityResult = validateCustomerProximity(
      customerLocation,
      restaurant.location,
      restaurant.allowedRadiusMeters || 300,
      1200 // Max allowed GPS inaccuracy tolerance in meters
    );

    if (!proximityResult.isValid) {
      return res.status(403).json({
        success: false,
        code: proximityResult.reason,
        message: proximityResult.message,
        distanceMeters: proximityResult.distanceMeters,
        allowedRadiusMeters: proximityResult.allowedRadiusMeters,
      });
    }

    // 4. Validate Items & Re-calculate Prices on the Server
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'EMPTY_CART',
        message: 'Please add at least one product to your order.',
      });
    }

    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        restaurantId: restaurant._id,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          message: `Product "${item.name || item.productId}" was not found.`,
        });
      }

      if (!product.isAvailable) {
        return res.status(400).json({
          success: false,
          code: 'PRODUCT_UNAVAILABLE',
          message: `Product "${product.name}" is currently sold out or unavailable.`,
        });
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

      // Base price: use discount price if present, else regular price
      let unitPrice = product.discountPrice !== null && product.discountPrice !== undefined
        ? product.discountPrice
        : product.price;

      // Handle variation (e.g. Large, Small)
      let selectedVariation = null;
      if (item.variation && item.variation.name) {
        const foundVar = product.variations.find((v) => v.name === item.variation.name);
        if (foundVar) {
          selectedVariation = { name: foundVar.name, price: foundVar.price };
          unitPrice = foundVar.price;
        }
      }

      // Handle add-ons
      const selectedAddOns = [];
      let addOnsTotal = 0;
      if (Array.isArray(item.addOns)) {
        for (const addOn of item.addOns) {
          const foundAddOn = product.addOns.find((a) => a.name === addOn.name);
          if (foundAddOn) {
            selectedAddOns.push({ name: foundAddOn.name, price: foundAddOn.price });
            addOnsTotal += foundAddOn.price;
          }
        }
      }

      const itemTotal = (unitPrice + addOnsTotal) * quantity;
      subtotal += itemTotal;

      processedItems.push({
        productId: product._id,
        name: product.name,
        price: unitPrice,
        quantity,
        variation: selectedVariation,
        addOns: selectedAddOns,
        specialInstructions: item.specialInstructions ? item.specialInstructions.trim() : '',
        itemTotal: Math.round(itemTotal * 100) / 100,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const taxPercentage = restaurant.taxPercentage || 0;
    const taxAmount = Math.round(((subtotal * taxPercentage) / 100) * 100) / 100;

    const serviceChargePercentage = restaurant.serviceChargePercentage || 0;
    const serviceChargeAmount = Math.round(((subtotal * serviceChargePercentage) / 100) * 100) / 100;

    const discountAmount = 0; // For promotional codes in future
    const grandTotal = Math.round((subtotal + taxAmount + serviceChargeAmount - discountAmount) * 100) / 100;

    // 5. Generate Atomic Order Number
    const orderNumber = await OrderCounter.getNextOrderNumber(restaurant._id);

    // Initial status: if autoAcceptOrders is enabled in settings, confirm directly; else 'new'
    const initialStatus = restaurant.autoAcceptOrders ? 'confirmed' : 'new';

    // 6. Create Order Document
    const order = await Order.create({
      orderNumber,
      restaurantId: restaurant._id,
      tableId: table._id,
      tableNumber: table.tableNumber,
      customer: {
        name: customerName ? customerName.trim() : `Table ${table.tableNumber} Guest`,
        phone: customerPhone ? customerPhone.trim() : '',
        location: {
          latitude: customerLocation?.latitude || 0,
          longitude: customerLocation?.longitude || 0,
          distanceMeters: proximityResult.distanceMeters,
          accuracy: customerLocation?.accuracy || 0,
          verified: proximityResult.isValid,
        },
      },
      items: processedItems,
      subtotal,
      taxAmount,
      discountAmount,
      serviceChargeAmount,
      grandTotal,
      paymentMethod,
      paymentStatus: 'pending',
      status: initialStatus,
      statusTimeline: [
        {
          status: 'new',
          timestamp: new Date(),
          note: 'Order successfully placed by customer at table',
          updatedBy: 'customer',
        },
      ],
      idempotencyKey: idempotencyKey || null,
      notes: specialNotes || '',
    });

    // 7. Update Table Occupancy
    table.occupancyStatus = 'has_pending_order';
    table.currentOrderId = order._id;
    table.lastOrderAt = new Date();
    await table.save();

    // 8. Emit Real-time Socket.IO Events
    emitNewOrder(restaurant._id, order);
    emitTableStatusUpdate(restaurant._id, table);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      orderNumber: order.orderNumber,
      orderId: order._id,
      trackingToken: order.trackingToken,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get orders for restaurant admin dashboard with filters
// @route GET /api/orders
export const getOrders = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { status, date, search, page = 1, limit = 50 } = req.query;

    const query = { restaurantId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { tableNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
      ];
    }

    if (date === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfDay };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single order by ID
// @route GET /api/orders/:id
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc Update order status (Admin / Staff)
// @route PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note, paymentStatus } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const validStatuses = ['new', 'confirmed', 'preparing', 'ready', 'delivered', 'rejected', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided' });
    }

    if (status && status !== order.status) {
      order.status = status;
      order.statusTimeline.push({
        status,
        timestamp: new Date(),
        note: note || `Order marked as ${status}`,
        updatedBy: req.user.name || req.user.role,
      });

      // Update table occupancy status accordingly
      if (order.tableId) {
        try {
          const table = await Table.findById(order.tableId);
          if (table) {
            if (status === 'confirmed' || status === 'preparing' || status === 'ready') {
              table.occupancyStatus = 'has_active_order';
            } else if (status === 'delivered') {
              table.occupancyStatus = 'occupied'; // Still occupied until table is marked available
            } else if (status === 'cancelled' || status === 'rejected') {
              table.occupancyStatus = 'available';
              table.currentOrderId = null;
            }
            await table.save();
            emitTableStatusUpdate(req.user.restaurantId, table);
          }
        } catch (tableErr) {
          console.warn('[Warning] Failed to update table status during order update:', tableErr.message);
        }
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    // Broadcast status update via Socket.IO safely
    try {
      emitOrderStatusUpdate(order.restaurantId, order.trackingToken, order);
    } catch (socketErr) {
      console.warn('[Warning] Failed to emit Socket.IO status update:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} updated to ${order.status}`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Customer track order status via tracking token or order ID
// @route GET /api/orders/track/:token
export const trackOrderCustomer = async (req, res, next) => {
  try {
    const { token } = req.params;

    const order = await Order.findOne({
      $or: [{ trackingToken: token }, { _id: token.match(/^[0-9a-fA-F]{24}$/) ? token : null }],
    }).populate('restaurantId', 'name logo currency currencySymbol phone address location');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Please check your order tracking link.',
      });
    }

    res.status(200).json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        customer: order.customer,
        items: order.items,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        serviceChargeAmount: order.serviceChargeAmount,
        discountAmount: order.discountAmount,
        grandTotal: order.grandTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        statusTimeline: order.statusTimeline,
        trackingToken: order.trackingToken,
        createdAt: order.createdAt,
        restaurant: order.restaurantId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete an order (Admin / Manager only)
// @route DELETE /api/orders/:id
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If order was holding a table, free it up
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table && table.currentOrderId && table.currentOrderId.toString() === order._id.toString()) {
        table.currentOrderId = null;
        table.occupancyStatus = 'available';
        await table.save();
        emitTableStatusUpdate(req.user.restaurantId, table);
      }
    }

    await Order.findByIdAndDelete(order._id);

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

