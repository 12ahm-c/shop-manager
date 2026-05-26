// MongoDB backup script
// Usage: node scripts/backup.js [--output=./backups]
// Requires: mongodump available in PATH or MONGODB_URI env var

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(__dirname, '..', 'backups');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dumpDir = path.join(outputDir, `shopmanager-backup-${timestamp}`);

fs.mkdirSync(dumpDir, { recursive: true });

try {
  console.log(`Backing up to ${dumpDir}...`);
  execSync(`mongodump --uri="${uri}" --out="${dumpDir}"`, { stdio: 'inherit' });
  console.log(`Backup completed: ${dumpDir}`);
} catch (err) {
  console.error('Backup failed:', err.message);
  process.exit(1);
}
