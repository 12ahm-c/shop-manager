// Integration test: FIFO stock selection correctness
// Run with: node src/tests/integration/fifo.test.js
// Requires: running MongoDB instance

const mongoose = require('mongoose');
require('dotenv').config();

const Stock = require('../../modules/stock/stock.model');
const Product = require('../../modules/products/product.model');

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
    console.log('\n=== FIFO Stock Selection Tests ===\n');

    const storeId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();

    // Seed stock lots with different reception dates
    const lots = [
      { storeId, productId, quantity: 10, purchasePrice: 100, receptionDate: new Date('2025-01-01'), supplierId: new mongoose.Types.ObjectId(), isActive: true },
      { storeId, productId, quantity: 20, purchasePrice: 120, receptionDate: new Date('2025-02-01'), supplierId: new mongoose.Types.ObjectId(), isActive: true },
      { storeId, productId, quantity: 30, purchasePrice: 130, receptionDate: new Date('2025-03-01'), supplierId: new mongoose.Types.ObjectId(), isActive: true }
    ];
    await Stock.insertMany(lots);

    // Query: FIFO order should be by receptionDate ascending
    const fifoLots = await Stock.find({ productId, storeId, isActive: true, quantity: { $gt: 0 } })
      .sort({ receptionDate: 1 })
      .lean();

    await assert(fifoLots.length === 3, 'All 3 lots returned');
    await assert(fifoLots[0].purchasePrice === 100, 'First lot is oldest (price 100)');
    await assert(fifoLots[1].purchasePrice === 120, 'Second lot is middle (price 120)');
    await assert(fifoLots[2].purchasePrice === 130, 'Third lot is newest (price 130)');

    // Test: expired lots should be excluded
    const expiredLot = {
      storeId, productId, quantity: 50, purchasePrice: 90, receptionDate: new Date('2024-01-01'),
      supplierId: new mongoose.Types.ObjectId(), isActive: true, expiryDate: new Date('2024-06-01')
    };
    await Stock.create(expiredLot);

    const activeFifo = await Stock.find({
      productId, storeId, isActive: true, quantity: { $gt: 0 },
      $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }]
    }).sort({ receptionDate: 1 }).lean();

    await assert(activeFifo.length === 3, 'Expired lot excluded from active FIFO');

    // Cleanup
    await Stock.deleteMany({ storeId });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
