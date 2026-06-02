// Integration test: Append-only logs
// Run with: node src/tests/integration/logs.test.js
// Requires: running MongoDB instance

const mongoose = require('mongoose');
require('dotenv').config();

const Log = require('../../modules/admin/log.model');

let passed = 0;
let failed = 0;

async function assert(condition, message) {
  if (condition) { passed++; console.log(`  ✓ ${message}`); }
  else { failed++; console.error(`  ✗ ${message}`); }
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmanager_test';
  await mongoose.connect(uri);

  try {
    console.log('\n=== Append-Only Logs Tests ===\n');

    const log = await Log.create({
      storeId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      action: 'sale',
      entity: 'Sale',
      details: { test: true }
    });

    await assert(log._id, 'Log document created');

    // Test: updateOne should throw
    try {
      await Log.updateOne({ _id: log._id }, { action: 'login' });
      await assert(false, 'updateOne should be rejected');
    } catch (err) {
      await assert(err.message.includes('append-only'), 'updateOne rejected with append-only error');
    }

    // Test: deleteOne should throw
    try {
      await Log.deleteOne({ _id: log._id });
      await assert(false, 'deleteOne should be rejected');
    } catch (err) {
      await assert(err.message.includes('append-only'), 'deleteOne rejected with append-only error');
    }

    // Test: log count after attempts
    const count = await Log.countDocuments();
    await assert(count === 1, 'Only one log document exists (no orphan writes)');

    // Cleanup
    await Log.deleteMany({}); // bypasses pre-hooks via direct model call bypass
    // Actually clean via native driver
    await mongoose.connection.collection('logs').deleteMany({});

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
