// MongoDB restore script
// Usage: node scripts/restore.js <backup-directory>
// Requires: mongorestore available in PATH or MONGODB_URI env var

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/restore.js <backup-directory>');
  process.exit(1);
}

const backupDir = path.resolve(args[0]);
if (!fs.existsSync(backupDir)) {
  console.error(`Backup directory not found: ${backupDir}`);
  process.exit(1);
}

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

console.log(`WARNING: This will overwrite the current database.`);
console.log(`Source: ${backupDir}`);
console.log(`Target: ${uri}`);
console.log('');

if (process.env.NODE_ENV === 'production') {
  console.error('Restore is not allowed in production via script. Use MongoDB Atlas restore instead.');
  process.exit(1);
}

try {
  execSync(`mongorestore --uri="${uri}" "${backupDir}"`, { stdio: 'inherit' });
  console.log('Restore completed successfully');
} catch (err) {
  console.error('Restore failed:', err.message);
  process.exit(1);
}
