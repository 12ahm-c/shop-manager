const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./socket/socket.server');
const { startInvoiceWorker } = require('./jobs/invoice.job');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// Connect to MongoDB Atlas
connectDB().then(() => {
  const server = http.createServer(app);

  // Initialize Socket.IO
  const io = initSocket(server);
  app.setIO(io);

  // Start BullMQ invoice worker (non-blocking)
  if (process.env.REDIS_URL || process.env.NODE_ENV !== 'production') {
    try {
      startInvoiceWorker();
      console.log('Invoice worker started');
    } catch (err) {
      console.warn('Invoice worker not available (Redis may be offline):', err.message);
    }
  }

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});
