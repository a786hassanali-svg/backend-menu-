import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Table } from '../models/Table.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';

// @desc Get overview statistics
// @route GET /api/analytics/overview
export const getOverviewStats = async (req, res, next) => {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Valid revenue orders exclude rejected and cancelled
    const validRevenueStatuses = ['confirmed', 'preparing', 'ready', 'delivered'];

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      revenueAggregation,
      activeTablesCount,
      inactiveTablesCount,
    ] = await Promise.all([
      Order.countDocuments({ restaurantId }),
      Order.countDocuments({ restaurantId, createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ restaurantId, status: 'new' }),
      Order.countDocuments({ restaurantId, status: { $in: ['confirmed', 'preparing', 'ready'] } }),
      Order.countDocuments({ restaurantId, status: 'delivered' }),
      Order.aggregate([
        {
          $match: {
            restaurantId,
            status: { $in: validRevenueStatuses },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            todayRevenue: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfToday] }, '$grandTotal', 0],
              },
            },
            weekRevenue: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$grandTotal', 0],
              },
            },
            monthRevenue: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$grandTotal', 0],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Table.countDocuments({ restaurantId, isActive: true }),
      Table.countDocuments({ restaurantId, isActive: false }),
    ]);

    const rev = revenueAggregation[0] || {
      totalRevenue: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      monthRevenue: 0,
      count: 0,
    };

    const averageOrderValue = rev.count > 0 ? Math.round((rev.totalRevenue / rev.count) * 100) / 100 : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        todayOrders,
        pendingOrders,
        confirmedOrders,
        deliveredOrders,
        todayRevenue: Math.round(rev.todayRevenue * 100) / 100,
        weekRevenue: Math.round(rev.weekRevenue * 100) / 100,
        monthRevenue: Math.round(rev.monthRevenue * 100) / 100,
        totalRevenue: Math.round(rev.totalRevenue * 100) / 100,
        averageOrderValue,
        activeTables: activeTablesCount,
        inactiveTables: inactiveTablesCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get sales trends for charts (daily/weekly)
// @route GET /api/analytics/sales
export const getSalesChart = async (req, res, next) => {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const { range = '7days' } = req.query;

    const days = range === '30days' ? 30 : range === 'today' ? 1 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const salesData = await Order.aggregate([
      {
        $match: {
          restaurantId,
          status: { $in: ['confirmed', 'preparing', 'ready', 'delivered'] },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format for Recharts
    const formatted = salesData.map((d) => ({
      date: d._id,
      revenue: Math.round(d.revenue * 100) / 100,
      orders: d.orders,
    }));

    res.status(200).json({ success: true, sales: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc Get top selling products
// @route GET /api/analytics/top-products
export const getTopProducts = async (req, res, next) => {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

    const topItems = await Order.aggregate([
      {
        $match: {
          restaurantId,
          status: { $in: ['confirmed', 'preparing', 'ready', 'delivered'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalSales: { $sum: '$items.itemTotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 6 },
    ]);

    const formatted = topItems.map((item) => ({
      name: item._id,
      quantity: item.totalQuantity,
      sales: Math.round(item.totalSales * 100) / 100,
    }));

    res.status(200).json({ success: true, topProducts: formatted });
  } catch (error) {
    next(error);
  }
};

