import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/socketManager.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB Atlas
    await connectDB();

    // 2. Create HTTP Server
    const httpServer = http.createServer(app);

    // 3. Initialize Socket.IO
    initSocket(httpServer, process.env.CLIENT_URL || 'http://localhost:5173');

    // 4. Start listening
    httpServer.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Restaurant Server running on port ${PORT}`);
      console.log(`📡 Socket.IO Real-Time Server initialized`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error(`Fatal Server Startup Error: ${error.message}`);
    process.exit(1);
  }
};

startServer();

