const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./socket/socket.server');
const { startInvoiceWorker } = require('./jobs/invoice.job');
const { checkDebtReminders } = require('./jobs/debtReminder.job');
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

  // Debt reminder cron — run every hour
  setInterval(async () => {
    try {
      await checkDebtReminders();
    } catch (err) {
      console.error('[DebtReminder] Error:', err.message);
    }
  }, 60 * 60 * 1000);

  // Run once shortly after startup
  setTimeout(async () => {
    try {
      await checkDebtReminders();
      console.log('Initial debt reminder check completed');
    } catch (err) {
      console.error('[DebtReminder] Initial check error:', err.message);
    }
  }, 30 * 1000);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});
