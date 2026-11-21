import { Server } from 'socket.io';

let ioInstance = null;

export const initSocket = (httpServer, allowedOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin || '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    // Join restaurant-specific room for real-time admin / staff order dashboard
    socket.on('join_restaurant', (data) => {
      const restaurantId = typeof data === 'object' ? data.restaurantId : data;
      if (restaurantId) {
        const roomName = `restaurant_${restaurantId}`;
        socket.join(roomName);
        // Also join KDS room
        socket.join(`kds_${restaurantId}`);
      }
    });

    // Leave restaurant room
    socket.on('leave_restaurant', (restaurantId) => {
      if (restaurantId) {
        socket.leave(`restaurant_${restaurantId}`);
        socket.leave(`kds_${restaurantId}`);
      }
    });

    // Customer joins their unique order tracking room
    socket.on('join_order_tracking', (data) => {
      const trackingToken = typeof data === 'object' ? data.trackingToken : data;
      if (trackingToken) {
        socket.join(`order_${trackingToken}`);
      }
    });

    // Customer leaves order tracking
    socket.on('leave_order_tracking', (trackingToken) => {
      if (trackingToken) {
        socket.leave(`order_${trackingToken}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return ioInstance;
};

/**
 * Emit new order to restaurant admin dashboard & KDS
 */
export const emitNewOrder = (restaurantId, order) => {
  if (!ioInstance) return;
  const room = `restaurant_${restaurantId}`;
  ioInstance.to(room).emit('order:new', {
    message: `New Order #${order.orderNumber} placed for Table ${order.tableNumber}!`,
    order,
  });

  // Also emit to KDS
  ioInstance.to(`kds_${restaurantId}`).emit('kds:order_new', order);
};

/**
 * Emit order status update to admin, KDS, and customer tracking room
 */
export const emitOrderStatusUpdate = (restaurantId, trackingToken, updatedOrder) => {
  if (!ioInstance) return;

  // Broadcast to restaurant admin & staff
  ioInstance.to(`restaurant_${restaurantId}`).emit('order:status_changed', {
    orderId: updatedOrder._id,
    orderNumber: updatedOrder.orderNumber,
    status: updatedOrder.status,
    tableNumber: updatedOrder.tableNumber,
    order: updatedOrder,
  });

  // Broadcast to KDS
  ioInstance.to(`kds_${restaurantId}`).emit('kds:order_updated', updatedOrder);

  // Broadcast to the specific customer tracking room
  if (trackingToken) {
    ioInstance.to(`order_${trackingToken}`).emit('order:customer_update', {
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      statusTimeline: updatedOrder.statusTimeline,
      order: updatedOrder,
    });
  }
};

/**
 * Emit table status update (e.g. occupancy status change)
 */
export const emitTableStatusUpdate = (restaurantId, table) => {
  if (!ioInstance) return;
  ioInstance.to(`restaurant_${restaurantId}`).emit('table:status_changed', table);
};

