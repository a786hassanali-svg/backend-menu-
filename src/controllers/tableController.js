import crypto from 'crypto';
import { Table } from '../models/Table.js';
import { Order } from '../models/Order.js';
import { generateQRCodeDataUrl, generateQRCodeSVG, generateQRCodeBuffer } from '../utils/qr.js';
import { emitTableStatusUpdate } from '../sockets/socketManager.js';

const getQRMenuUrl = (qrToken, req = null) => {
  if (process.env.QR_BASE_URL) {
    return `${process.env.QR_BASE_URL.replace(/\/$/, '')}/${qrToken}`;
  }
  const origin = req?.headers?.origin || req?.headers?.referer;
  if (origin) {
    try {
      const u = new URL(origin);
      return `${u.origin}/menu/${qrToken}`;
    } catch {}
  }
  if (process.env.CLIENT_URL) {
    return `${process.env.CLIENT_URL.replace(/\/$/, '')}/menu/${qrToken}`;
  }
  return `http://localhost:5173/menu/${qrToken}`;
};

// @desc Get all tables for restaurant
// @route GET /api/tables
export const getTables = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = { restaurantId: req.user.restaurantId };

    if (status && status !== 'all') {
      if (status === 'active') query.isActive = true;
      else if (status === 'inactive') query.isActive = false;
      else query.occupancyStatus = status;
    }

    if (search) {
      query.$or = [
        { tableNumber: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const tables = await Table.find(query)
      .populate('currentOrderId')
      .sort({ tableNumber: 1 });

    res.status(200).json({ success: true, count: tables.length, tables });
  } catch (error) {
    next(error);
  }
};

// @desc Create new table with secure QR
// @route POST /api/tables
export const createTable = async (req, res, next) => {
  try {
    const { tableNumber, name, capacity } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ success: false, message: 'Table number is required' });
    }

    const existing = await Table.findOne({
      restaurantId: req.user.restaurantId,
      tableNumber: tableNumber.trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Table number '${tableNumber}' already exists in your restaurant.`,
      });
    }

    const qrToken = crypto.randomBytes(16).toString('hex');
    const menuUrl = getQRMenuUrl(qrToken, req);
    const qrCodeDataUrl = await generateQRCodeDataUrl(menuUrl);

    const table = await Table.create({
      restaurantId: req.user.restaurantId,
      tableNumber: tableNumber.trim(),
      name: name ? name.trim() : `Table ${tableNumber}`,
      capacity: capacity ? Number(capacity) : 4,
      qrToken,
      qrCodeDataUrl,
      isActive: true,
      occupancyStatus: 'available',
    });

    emitTableStatusUpdate(req.user.restaurantId, table);

    res.status(201).json({
      success: true,
      message: 'Table created successfully with unique QR code',
      table,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update table details
// @route PUT /api/tables/:id
export const updateTable = async (req, res, next) => {
  try {
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const { tableNumber, name, capacity, isActive } = req.body;

    if (tableNumber && tableNumber !== table.tableNumber) {
      const duplicate = await Table.findOne({
        restaurantId: req.user.restaurantId,
        tableNumber: tableNumber.trim(),
        _id: { $ne: table._id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Table number '${tableNumber}' already exists.`,
        });
      }
      table.tableNumber = tableNumber.trim();
    }

    if (name !== undefined) table.name = name.trim();
    if (capacity !== undefined) table.capacity = Number(capacity);
    if (isActive !== undefined) {
      table.isActive = Boolean(isActive);
      if (!table.isActive) {
        table.occupancyStatus = 'inactive';
      } else if (table.occupancyStatus === 'inactive') {
        table.occupancyStatus = 'available';
      }
    }

    await table.save();
    emitTableStatusUpdate(req.user.restaurantId, table);

    res.status(200).json({ success: true, message: 'Table updated successfully', table });
  } catch (error) {
    next(error);
  }
};

// @desc Update table occupancy status (e.g. mark Available after customer leaves)
// @route PATCH /api/tables/:id/occupancy
export const updateOccupancyStatus = async (req, res, next) => {
  try {
    const { occupancyStatus } = req.body;
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const validStatuses = ['available', 'occupied', 'has_pending_order', 'has_active_order', 'inactive'];
    if (!validStatuses.includes(occupancyStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid occupancy status' });
    }

    table.occupancyStatus = occupancyStatus;
    if (occupancyStatus === 'available') {
      table.currentOrderId = null;
    }

    await table.save();
    emitTableStatusUpdate(req.user.restaurantId, table);

    res.status(200).json({ success: true, message: 'Table occupancy updated', table });
  } catch (error) {
    next(error);
  }
};

// @desc Regenerate QR code token for table (revokes old code immediately)
// @route POST /api/tables/:id/regenerate-qr
export const regenerateQR = async (req, res, next) => {
  try {
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const newQrToken = crypto.randomBytes(16).toString('hex');
    const menuUrl = getQRMenuUrl(newQrToken, req);
    const newQrCodeDataUrl = await generateQRCodeDataUrl(menuUrl);

    table.qrToken = newQrToken;
    table.qrCodeDataUrl = newQrCodeDataUrl;
    await table.save();

    emitTableStatusUpdate(req.user.restaurantId, table);

    res.status(200).json({
      success: true,
      message: 'QR code regenerated successfully. Old QR codes are now revoked.',
      table,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Download QR in PNG or SVG
// @route GET /api/tables/:id/qr-download
export const downloadQR = async (req, res, next) => {
  try {
    const { format = 'png' } = req.query;
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const menuUrl = getQRMenuUrl(table.qrToken, req);

    if (format === 'svg') {
      const svg = await generateQRCodeSVG(menuUrl);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="table-${table.tableNumber}-qr.svg"`
      );
      return res.send(svg);
    } else {
      const buffer = await generateQRCodeBuffer(menuUrl);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="table-${table.tableNumber}-qr.png"`
      );
      return res.send(buffer);
    }
  } catch (error) {
    next(error);
  }
};

// @desc Delete table if no active orders
// @route DELETE /api/tables/:id
export const deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    // Check if table has active non-completed orders
    const activeOrders = await Order.countDocuments({
      tableId: table._id,
      status: { $in: ['new', 'confirmed', 'preparing', 'ready'] },
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Table ${table.tableNumber} because it currently has ${activeOrders} active order(s). Please complete or cancel them first.`,
      });
    }

    await Table.deleteOne({ _id: table._id });

    res.status(200).json({
      success: true,
      message: `Table ${table.tableNumber} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

