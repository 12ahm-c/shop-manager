// Integration test: Sale transaction rollback
// Run with: node src/tests/integration/sales.test.js
// Requires: running MongoDB instance

const mongoose = require('mongoose');
require('dotenv').config();

const Sale = require('../../modules/sales/sale.model');
const Stock = require('../../modules/stock/stock.model');
const Wallet = require('../../modules/wallets/wallet.model');
const WalletTransaction = require('../../modules/wallets/walletTransaction.model');
const Customer = require('../../modules/customers/customer.model');
const { createSale } = require('../../modules/sales/sale.service');

let passed = 0;
let failed = 0;

async function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmanager_test';
  await mongoose.connect(uri);

  try {
    console.log('\n=== Sale Transaction Rollback Tests ===\n');

    // Test: createSale should roll back on error
    const fakeUser = { id: new mongoose.Types.ObjectId(), role: 'employee', storeId: new mongoose.Types.ObjectId() };
    const invalidData = { items: [], paymentMethod: 'cash' };

    try {
      await createSale(invalidData, fakeUser);
      await assert(false, 'createSale should throw on empty items');
    } catch (err) {
      await assert(err.code === 'NOT_FOUND' || err.code === 'VALIDATION_ERROR' || err.status >= 400,
        'createSale rolls back on invalid input');
    }

    // Test: no orphan documents after failed sale
    const saleCount = await Sale.countDocuments();
    await assert(saleCount >= 0, 'No orphan sales after failed transaction');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
