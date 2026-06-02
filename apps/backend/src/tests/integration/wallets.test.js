// Integration test: Wallet transfer atomicity
// Run with: node src/tests/integration/wallets.test.js
// Requires: running MongoDB instance

const mongoose = require('mongoose');
require('dotenv').config();

const Wallet = require('../../modules/wallets/wallet.model');
const WalletTransaction = require('../../modules/wallets/walletTransaction.model');

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
    console.log('\n=== Wallet Transfer Atomicity Tests ===\n');

    const storeId = new mongoose.Types.ObjectId();

    const walletA = await Wallet.create({ storeId, name: 'Test A', type: 'cash', balance: 1000, isActive: true });
    const walletB = await Wallet.create({ storeId, name: 'Test B', type: 'bank', balance: 500, isActive: true });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedA = await Wallet.findByIdAndUpdate(walletA._id, { $inc: { balance: -300 } }, { session, new: true });
      const updatedB = await Wallet.findByIdAndUpdate(walletB._id, { $inc: { balance: 300 } }, { session, new: true });

      await WalletTransaction.create([{
        storeId, walletId: walletA._id, type: 'transfer', amount: -300,
        balanceAfter: updatedA.balance, reference: walletB._id.toString(),
        description: 'Test transfer', userId: new mongoose.Types.ObjectId()
      }], { session });

      await WalletTransaction.create([{
        storeId, walletId: walletB._id, type: 'transfer', amount: 300,
        balanceAfter: updatedB.balance, reference: walletA._id.toString(),
        description: 'Test transfer', userId: new mongoose.Types.ObjectId()
      }], { session });

      await session.commitTransaction();

      const finalA = await Wallet.findById(walletA._id);
      const finalB = await Wallet.findById(walletB._id);

      await assert(finalA.balance === 700, 'Wallet A debited correctly (1000 - 300 = 700)');
      await assert(finalB.balance === 800, 'Wallet B credited correctly (500 + 300 = 800)');
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // Test: insufficient balance aborts
    const session2 = await mongoose.startSession();
    session2.startTransaction();
    try {
      await Wallet.findByIdAndUpdate(walletA._id, { $inc: { balance: -99999 } }, { session: session2 });
      await session2.commitTransaction();
      await assert(false, 'Should not allow overdraw');
    } catch {
      await session2.abortTransaction();
      const balanceCheck = await Wallet.findById(walletA._id);
      await assert(balanceCheck.balance === 700, 'Balance unchanged after abort');
    } finally {
      session2.endSession();
    }

    // Cleanup
    await Wallet.deleteMany({ storeId });
    await WalletTransaction.deleteMany({ storeId });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
