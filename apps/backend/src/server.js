const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./socket/socket.server');
const { startInvoiceWorker } = require('./jobs/invoice.job');
const { startWhatsAppWorker } = require('./jobs/whatsapp.worker');
const { startEmailWorker } = require('./jobs/email.worker');
const { startReportWorker } = require('./jobs/report.worker');
const { startBackupWorker } = require('./jobs/backup.worker');
const { checkDebtReminders } = require('./jobs/debtReminder.job');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  const server = http.createServer(app);

  const io = initSocket(server);
  app.setIO(io);

  function startWorker(name, startFn) {
    if (process.env.REDIS_URL || process.env.NODE_ENV !== 'production') {
      try {
        startFn();
        console.log(`${name} started`);
      } catch (err) {
        console.warn(`${name} not available (Redis may be offline):`, err.message);
      }
    }
  }

  startWorker('Invoice worker', startInvoiceWorker);
  startWorker('WhatsApp worker', startWhatsAppWorker);
  startWorker('Email worker', startEmailWorker);
  startWorker('Report worker', startReportWorker);
  startWorker('Backup worker', startBackupWorker);

  // Debt reminder cron — run every hour
  const runDebtCheck = async () => {
    try {
      await checkDebtReminders();
    } catch (err) {
      console.error('[DebtReminder] Error:', err.message);
    }
  };

  setInterval(runDebtCheck, 60 * 60 * 1000);

  setTimeout(async () => {
    await runDebtCheck();
    console.log('Initial debt reminder check completed');
  }, 30 * 1000);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});
