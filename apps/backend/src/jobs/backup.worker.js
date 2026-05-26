const { Worker } = require('bullmq');
const { execSync } = require('child_process');
const path = require('path');
const { getConnection } = require('./queue.service');

function startBackupWorker() {
  const connection = getConnection();
  const worker = new Worker('backup', async (job) => {
    const { storeId, triggeredBy } = job.data;
    console.log(`[BackupWorker] Starting backup triggered by ${triggeredBy || 'system'}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', '..', 'backups', `auto-backup-${timestamp}`);

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set');

    execSync(`mongodump --uri="${uri}" --out="${backupDir}"`, { stdio: 'inherit' });

    console.log(`[BackupWorker] Backup completed: ${backupDir}`);
    return { path: backupDir, timestamp, storeId };
  }, { connection, concurrency: 1 });

  worker.on('failed', (job, err) => {
    console.error(`[BackupWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

module.exports = { startBackupWorker };
