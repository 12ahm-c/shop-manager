// Integration test: Debt payment atomicity
// Run with: node src/tests/integration/debts.test.js
// Requires: running MongoDB instance

const mongoose = require('mongoose');
require('dotenv').config();

const Customer = require('../../modules/customers/customer.model');
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
    console.log('\n=== Debt Payment Atomicity Tests ===\n');

    const storeId = new mongoose.Types.ObjectId();

    const customer = await Customer.create({
      storeId, name: 'Test Customer', phone: '+22200000001',
      currentDebt: 500, creditLimit: 1000
    });

    const wallet = await Wallet.create({
      storeId, name: 'Test Wallet', type: 'cash', balance: 2000, isActive: true
    });

    // Test: atomic debt payment
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const paymentAmount = 200;

      const updatedWallet = await Wallet.findByIdAndUpdate(
        wallet._id, { $inc: { balance: paymentAmount } },
        { session, new: true }
      );

      const updatedCustomer = await Customer.findByIdAndUpdate(
        customer._id, { $inc: { currentDebt: -paymentAmount } },
        { session, new: true }
      );

      await WalletTransaction.create([{
        storeId, walletId: wallet._id, type: 'credit', amount: paymentAmount,
        balanceAfter: updatedWallet.balance,
        reference: customer._id.toString(),
        description: 'Debt payment', userId: new mongoose.Types.ObjectId()
      }], { session });

      await session.commitTransaction();

      await assert(updatedWallet.balance === 2200, 'Wallet credited (2000 + 200 = 2200)');
      await assert(updatedCustomer.currentDebt === 300, 'Customer debt decreased (500 - 200 = 300)');
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // Cleanup
    await Customer.deleteMany({ storeId });
    await Wallet.deleteMany({ storeId });
    await WalletTransaction.deleteMany({ storeId });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
