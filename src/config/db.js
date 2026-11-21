import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('[Database] MongoDB connection established.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database Error] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warn] MongoDB disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB reconnected successfully.');
    });

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'restaurant_qr_db',
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Fatal] ${error.message}`);
    process.exit(1);
  }
};


