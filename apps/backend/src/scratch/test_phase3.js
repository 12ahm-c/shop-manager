const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Store = require('../modules/stores/store.model');
const User = require('../modules/users/user.model');
const Supplier = require('../modules/suppliers/supplier.model');
const Product = require('../modules/products/product.model');
const Stock = require('../modules/stock/stock.model');
const Customer = require('../modules/customers/customer.model');
const Wallet = require('../modules/wallets/wallet.model');
const WalletTransaction = require('../modules/wallets/walletTransaction.model');
const Sale = require('../modules/sales/sale.model');
const Invoice = require('../modules/invoices/invoice.model');
const Idempotency = require('../utils/idempotency.model');
require('dotenv').config();

const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}/v1`;

const storeId = new mongoose.Types.ObjectId();
const supplierId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const employeeId = new mongoose.Types.ObjectId();
const customerId = new mongoose.Types.ObjectId();
const walletId = new mongoose.Types.ObjectId();

let server;
let testProductId;
let adminToken, employeeToken;
const adminHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` });
const employeeHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${employeeToken}` });

const signToken = (userId, role, sId) =>
  jwt.sign({ sub: userId.toString(), role, storeId: sId.toString() }, process.env.JWT_SECRET, { expiresIn: '15m' });

const setupData = async () => {
  console.log('Seeding test database...');
  await Store.deleteMany({});
  await User.deleteMany({});
  await Supplier.deleteMany({});
  await Product.deleteMany({});
  await Stock.deleteMany({});
  await Customer.deleteMany({});
  await Wallet.deleteMany({});
  await WalletTransaction.deleteMany({});
  await Sale.deleteMany({});
  await Invoice.deleteMany({});
  await Idempotency.deleteMany({});
  try { await mongoose.connection.db.collection('logs').drop(); } catch (e) {}

  await Store.create({
    _id: storeId, name: 'Test Store', currency: 'MRU',
    settings: { loyaltyPointsPer100: 1, loyaltyRedeemRate: 1, invoiceNextNumber: 1, vatRate: 0, lowStockThresholdPercent: 10 }
  });
  await Supplier.create({ _id: supplierId, storeId, name: 'Grossiste Alpha', currentDebt: 0 });
  await User.create({ _id: adminId, storeId, name: 'Ahmed Admin', phone: '+22236123450', passwordHash: 'pw', role: 'admin' });
  await User.create({ _id: employeeId, storeId, name: 'Zeyneb Employee', phone: '+22236123451', passwordHash: 'pw', role: 'employee' });
  await Customer.create({ _id: customerId, storeId, name: 'Ali Customer', phone: '+22236123499', creditLimit: 10000, currentDebt: 0, loyaltyPoints: 100 });
  await Wallet.create({ _id: walletId, storeId, name: 'Caisse Principale', type: 'cash', balance: 50000, minBalance: 1000, isActive: true });

  const prodRes = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ name: 'Amoxicilline 500mg', barcode: '1234567890123', category: 'Antibiotique', sellPrice: 150, purchasePrice: 90, minStock: 5 })
  });
  const prodData = await prodRes.json();
  testProductId = prodData.data._id;

  await fetch(`${BASE_URL}/stock/receive`, {
    method: 'POST',
    headers: { ...adminHeaders(), 'Idempotency-Key': 'phase3-seed-lot1' },
    body: JSON.stringify({ supplierId: supplierId.toString(), items: [{ productId: testProductId, quantity: 50, purchasePrice: 90, lotNumber: 'LOT-SEED-1' }] })
  });
  await fetch(`${BASE_URL}/stock/receive`, {
    method: 'POST',
    headers: { ...adminHeaders(), 'Idempotency-Key': 'phase3-seed-lot2' },
    body: JSON.stringify({ supplierId: supplierId.toString(), items: [{ productId: testProductId, quantity: 30, purchasePrice: 100, lotNumber: 'LOT-SEED-2' }] })
  });

  adminToken = signToken(adminId, 'admin', storeId);
  employeeToken = signToken(employeeId, 'employee', storeId);
  console.log('Seeding completed!');
};

const runTests = async () => {
  console.log('\n--- Running Phase 3 Tests ---');

  // ==========================================
  // Test 1: Cash Sale (no customer, no wallet)
  // ==========================================
  console.log('\nTest 1: Cash sale without customer/wallet...');
  const res1 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-cash-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 5 }], paymentMethod: 'cash' })
  });
  const d1 = await res1.json();
  if (res1.status !== 201 || !d1.success) throw new Error(`Cash sale failed: ${JSON.stringify(d1)}`);
  if (!d1.data.saleId || !d1.data.invoiceNumber || !d1.data.totalAmount) throw new Error('Missing sale response fields');
  console.log(`  PASS: saleId=${d1.data.saleId}, invoiceNumber=${d1.data.invoiceNumber}, total=${d1.data.totalAmount}`);

  // Verify Sale document
  const sale1 = await Sale.findById(d1.data.saleId);
  if (!sale1 || sale1.status !== 'completed') throw new Error('Sale document not created or wrong status');
  if (sale1.items.length !== 1 || sale1.items[0].quantity !== 5) throw new Error('Sale items incorrect');

  // ==========================================
  // Test 2: FIFO stock decrement verification
  // ==========================================
  console.log('\nTest 2: FIFO stock decrement...');
  const lots = await Stock.find({ productId: testProductId, storeId }).sort({ receptionDate: 1 });
  // LOT-SEED-1: 50 - 5 = 45, LOT-SEED-2: 30
  if (lots[0].quantity !== 45 || lots[1].quantity !== 30) {
    throw new Error(`FIFO decrement incorrect: got ${lots[0].quantity}, ${lots[1].quantity}`);
  }
  console.log('  PASS: Oldest lot correctly decremented first');

  // ==========================================
  // Test 3: Cash sale with wallet credit
  // ==========================================
  console.log('\nTest 3: Cash sale with wallet credit...');
  const res3 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-wallet-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 2 }], paymentMethod: 'cash', walletId: walletId.toString() })
  });
  const d3 = await res3.json();
  if (res3.status !== 201) throw new Error(`Wallet sale failed: ${JSON.stringify(d3)}`);

  const walletAfter = await Wallet.findById(walletId);
  // 50000 + (2 * 150) = 50300
  if (walletAfter.balance !== 50300) throw new Error(`Wallet balance incorrect: expected 50300, got ${walletAfter.balance}`);

  const wtx = await WalletTransaction.findOne({ reference: d3.data.saleId.toString() });
  if (!wtx || wtx.type !== 'credit' || wtx.amount !== 300) throw new Error('WalletTransaction not created correctly');
  console.log('  PASS: Wallet credited, WalletTransaction created');

  // ==========================================
  // Test 4: Cash sale with change calculation
  // ==========================================
  console.log('\nTest 4: Cash sale with change...');
  const res4 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-change-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 1 }], paymentMethod: 'cash', cashGiven: 200 })
  });
  const d4 = await res4.json();
  if (res4.status !== 201) throw new Error(`Sale with change failed: ${JSON.stringify(d4)}`);
  if (d4.data.changeAmount !== 50) throw new Error(`Change incorrect: expected 50, got ${d4.data.changeAmount}`);
  console.log('  PASS: Change correctly calculated as 50');

  // ==========================================
  // Test 5: Credit sale with customer debt
  // ==========================================
  console.log('\nTest 5: Credit sale with customer...');
  const res5 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-credit-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 3 }], paymentMethod: 'credit', customerId: customerId.toString() })
  });
  const d5 = await res5.json();
  if (res5.status !== 201) throw new Error(`Credit sale failed: ${JSON.stringify(d5)}`);

  const customerAfter = await Customer.findById(customerId);
  if (customerAfter.currentDebt !== 450) throw new Error(`Customer debt incorrect: expected 450, got ${customerAfter.currentDebt}`);
  if (d5.data.newDebt !== 450) throw new Error(`Response newDebt incorrect: expected 450, got ${d5.data.newDebt}`);
  console.log('  PASS: Customer debt incremented to 450');

  // ==========================================
  // Test 6: Credit limit exceeded
  // ==========================================
  console.log('\nTest 6: Credit limit exceeded...');
  // Customer has creditLimit=10000, currentDebt=450, so can borrow up to 9550
  // 64 * 150 = 9600 -> exceeds
  const res6 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-credit-over-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 64 }], paymentMethod: 'credit', customerId: customerId.toString() })
  });
  if (res6.status !== 422) {
    const d6 = await res6.json();
    throw new Error(`Expected 422 for credit limit, got ${res6.status}: ${JSON.stringify(d6)}`);
  }
  console.log('  PASS: Credit limit correctly rejected with 422');

  // ==========================================
  // Test 7: Insufficient stock
  // ==========================================
  console.log('\nTest 7: Insufficient stock rejection...');
  // 45+30=75 remaining - 5-2-1-3 = 64 remaining - 64 is exactly the limit, try 65
  const res7 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-insuf-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 200 }], paymentMethod: 'cash' })
  });
  if (res7.status !== 422) throw new Error(`Expected 422 for insufficient stock, got ${res7.status}`);
  console.log('  PASS: Insufficient stock rejected with 422');

  // ==========================================
  // Test 8: Loyalty points earn
  // ==========================================
  console.log('\nTest 8: Loyalty points earned on sale...');
  const res8 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-loyalty-earn-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 1 }], paymentMethod: 'cash', customerId: customerId.toString() })
  });
  const d8 = await res8.json();
  if (res8.status !== 201) throw new Error(`Loyalty earn sale failed: ${JSON.stringify(d8)}`);
  // 1 point per 100 MRU, 150 MRU = 1 point
  if (d8.data.loyaltyPointsEarned !== 1) throw new Error(`Expected 1 loyalty point earned, got ${d8.data.loyaltyPointsEarned}`);
  const custAfterEarn = await Customer.findById(customerId);
  // was 100, earned 1 = 101
  if (custAfterEarn.loyaltyPoints !== 101) throw new Error(`Loyalty points incorrect: expected 101, got ${custAfterEarn.loyaltyPoints}`);
  console.log('  PASS: Loyalty points earned correctly');

  // ==========================================
  // Test 9: Loyalty points redeem
  // ==========================================
  console.log('\nTest 9: Loyalty points redemption...');
  const res9 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-loyalty-redeem-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 1 }], paymentMethod: 'cash', customerId: customerId.toString(), useLoyaltyPoints: 50 })
  });
  const d9 = await res9.json();
  if (res9.status !== 201) throw new Error(`Loyalty redeem sale failed: ${JSON.stringify(d9)}`);
  const custAfterRedeem = await Customer.findById(customerId);
  // was 101, earned 1, redeemed 50 = 52
  if (custAfterRedeem.loyaltyPoints !== 52) throw new Error(`Loyalty after redeem incorrect: expected 52, got ${custAfterRedeem.loyaltyPoints}`);
  console.log('  PASS: Loyalty points redeemed correctly');

  // ==========================================
  // Test 10: Mixed payment
  // ==========================================
  console.log('\nTest 10: Mixed payment (cash + credit)...');
  const res10 = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-mixed-1' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 2 }], paymentMethod: 'mixed', cashGiven: 100, customerId: customerId.toString() })
  });
  const d10 = await res10.json();
  if (res10.status !== 201) throw new Error(`Mixed payment sale failed: ${JSON.stringify(d10)}`);
  // total = 300, cash = 100, credit = 200
  if (d10.data.newDebt !== 200) throw new Error(`Expected newDebt=200 for mixed payment, got ${d10.data.newDebt}`);
  const custAfterMixed = await Customer.findById(customerId);
  // was 450, new debt 200 = 650
  if (custAfterMixed.currentDebt !== 650) throw new Error(`Customer debt after mixed incorrect: expected 650, got ${custAfterMixed.currentDebt}`);
  console.log('  PASS: Mixed payment correctly split cash 100 / credit 200');

  // ==========================================
  // Test 11: Invoice document created
  // ==========================================
  console.log('\nTest 11: Invoice document creation...');
  const inv = await Invoice.findOne({ saleId: d1.data.saleId });
  if (!inv || inv.status !== 'issued') throw new Error('Invoice not created or wrong status');
  if (!inv.invoiceNumber || !inv.invoiceNumber.startsWith('FAC-')) throw new Error(`Invoice number format wrong: ${inv.invoiceNumber}`);
  console.log(`  PASS: Invoice ${inv.invoiceNumber} created with status=issued`);

  // ==========================================
  // Test 12: GET /sales/me/daily
  // ==========================================
  console.log('\nTest 12: Daily summary endpoint...');
  const res12 = await fetch(`${BASE_URL}/sales/me/daily`, { method: 'GET', headers: employeeHeaders() });
  const d12 = await res12.json();
  if (res12.status !== 200 || !d12.success) throw new Error(`Daily summary failed: ${JSON.stringify(d12)}`);
  if (!d12.data.totalSales || !d12.data.totalAmount) throw new Error('Daily summary missing fields');
  console.log(`  PASS: ${d12.data.totalSales} sales, total ${d12.data.totalAmount}`);

  // ==========================================
  // Test 13: GET /sales/me/history (employee - cost fields hidden)
  // ==========================================
  console.log('\nTest 13: Cashier history (employee)...');
  const res13 = await fetch(`${BASE_URL}/sales/me/history`, { method: 'GET', headers: employeeHeaders() });
  const d13 = await res13.json();
  if (res13.status !== 200 || !d13.success) throw new Error(`History failed: ${JSON.stringify(d13)}`);
  if (d13.data.length > 0 && d13.data[0].items) {
    if (d13.data[0].items[0].purchasePrice !== undefined) throw new Error('Employee should not see purchasePrice in items');
    if (d13.data[0].items[0].profit !== undefined) throw new Error('Employee should not see profit in items');
  }
  console.log('  PASS: Employee history hides purchasePrice and profit');

  // ==========================================
  // Test 14: GET /sales (admin list)
  // ==========================================
  console.log('\nTest 14: Admin sales list...');
  const res14 = await fetch(`${BASE_URL}/sales`, { method: 'GET', headers: adminHeaders() });
  const d14 = await res14.json();
  if (res14.status !== 200 || !d14.success) throw new Error(`Admin sales list failed: ${JSON.stringify(d14)}`);
  if (!d14.meta || d14.meta.total < 6) throw new Error(`Expected at least 6 sales, got ${d14.meta?.total}`);
  console.log(`  PASS: ${d14.meta.total} sales listed with pagination`);

  // ==========================================
  // Test 15: GET /sales/:id
  // ==========================================
  console.log('\nTest 15: Sale detail...');
  const res15 = await fetch(`${BASE_URL}/sales/${d1.data.saleId}`, { method: 'GET', headers: adminHeaders() });
  const d15 = await res15.json();
  if (res15.status !== 200 || !d15.success) throw new Error(`Sale detail failed: ${JSON.stringify(d15)}`);
  if (!d15.data.sale || !d15.data.invoice) throw new Error('Sale detail missing invoice');
  console.log('  PASS: Sale detail includes invoice');

  // ==========================================
  // Test 16: Cancel sale + effects reversal
  // ==========================================
  console.log('\nTest 16: Cancel sale and verify reversal...');
  // Get stock before cancel
  const lotsBefore = await Stock.find({ productId: testProductId, storeId }).sort({ receptionDate: 1 });
  const lot1Before = lotsBefore[0].quantity;
  const lot2Before = lotsBefore[1].quantity;
  const walletBeforeCancel = await Wallet.findById(walletId);

  const res16 = await fetch(`${BASE_URL}/sales/${d3.data.saleId}/cancel`, { method: 'POST', headers: adminHeaders() });
  const d16 = await res16.json();
  if (res16.status !== 200) throw new Error(`Sale cancel failed: ${JSON.stringify(d16)}`);

  // Verify stock restored
  const lotsAfter = await Stock.find({ productId: testProductId, storeId }).sort({ receptionDate: 1 });
  if (lotsAfter[0].quantity !== lot1Before + 2) throw new Error(`Stock not restored for lot 1: ${lotsAfter[0].quantity} vs ${lot1Before + 2}`);

  // Verify wallet reversed
  const walletAfterCancel = await Wallet.findById(walletId);
  if (walletAfterCancel.balance !== walletBeforeCancel.balance - 300) throw new Error(`Wallet not reversed: ${walletAfterCancel.balance} vs ${walletBeforeCancel.balance - 300}`);

  // Verify invoice cancelled
  const invCancelled = await Invoice.findOne({ saleId: d3.data.saleId });
  if (invCancelled.status !== 'cancelled') throw new Error('Invoice not marked cancelled');

  const cancelledSale = await Sale.findById(d3.data.saleId);
  if (cancelledSale.status !== 'cancelled') throw new Error('Sale not marked cancelled');
  console.log('  PASS: Stock, wallet, invoice all correctly reversed');

  // ==========================================
  // Test 17: Double cancel prevention
  // ==========================================
  console.log('\nTest 17: Double cancel prevention...');
  const res17 = await fetch(`${BASE_URL}/sales/${d3.data.saleId}/cancel`, { method: 'POST', headers: adminHeaders() });
  if (res17.status !== 409) throw new Error(`Expected 409 for double cancel, got ${res17.status}`);
  console.log('  PASS: Double cancel returns 409 INVALID_STATE');

  // ==========================================
  // Test 18: Idempotency on sales
  // ==========================================
  console.log('\nTest 18: Idempotency key handling...');
  const res18a = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-idemp-dup' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 1 }], paymentMethod: 'cash' })
  });
  if (res18a.status !== 201) throw new Error(`First idempotent sale failed: ${res18a.status}`);

  const res18b = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-idemp-dup' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 1 }], paymentMethod: 'cash' })
  });
  if (res18b.status !== 200) throw new Error(`Cached response should be 200, got ${res18b.status}`);

  const res18c = await fetch(`${BASE_URL}/sales`, {
    method: 'POST',
    headers: { ...employeeHeaders(), 'Idempotency-Key': 'sale-idemp-dup' },
    body: JSON.stringify({ items: [{ productId: testProductId, quantity: 99 }], paymentMethod: 'cash' })
  });
  if (res18c.status !== 409) throw new Error(`Mismatched body should return 409, got ${res18c.status}`);
  console.log('  PASS: Idempotency correctly handles duplicate and mismatched keys');

  // ==========================================
  // Test 19: Employee cannot see purchasePrice in GET /sales/:id
  // ==========================================
  console.log('\nTest 19: Employee role restriction on sale detail...');
  const res19 = await fetch(`${BASE_URL}/sales/${d1.data.saleId}`, { method: 'GET', headers: employeeHeaders() });
  const d19 = await res19.json();
  if (res19.status !== 200) throw new Error(`Employee sale detail failed: ${res19.status}`);
  if (d19.data.sale.items[0].purchasePrice !== undefined) throw new Error('Employee should not see purchasePrice');
  if (d19.data.sale.items[0].profit !== undefined) throw new Error('Employee should not see profit');
  console.log('  PASS: purchasePrice and profit hidden from employee');

  // ==========================================
  // Test 20: Customer endpoints
  // ==========================================
  console.log('\nTest 20: Customer CRUD...');
  const res20a = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: employeeHeaders(),
    body: JSON.stringify({ name: 'Nouveau Client', phone: '+22236123488', creditLimit: 5000 })
  });
  const d20a = await res20a.json();
  if (res20a.status !== 201) throw new Error(`Create customer failed: ${JSON.stringify(d20a)}`);

  const res20b = await fetch(`${BASE_URL}/customers/search?q=Nouveau`, { method: 'GET', headers: employeeHeaders() });
  const d20b = await res20b.json();
  if (res20b.status !== 200 || d20b.data.length === 0) throw new Error('Customer search failed');

  const res20c = await fetch(`${BASE_URL}/customers/${d20a.data._id}`, { method: 'GET', headers: employeeHeaders() });
  const d20c = await res20c.json();
  if (res20c.status !== 200) throw new Error('Customer detail failed');
  if (!d20c.data.recentSales) throw new Error('Customer detail missing recent sales');
  console.log('  PASS: Customer create/search/detail work correctly');

  // ==========================================
  // Test 21: Wallet endpoints
  // ==========================================
  console.log('\nTest 21: Wallet CRUD...');
  const res21a = await fetch(`${BASE_URL}/wallets`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ name: 'Banque', type: 'bank', minBalance: 500 })
  });
  const d21a = await res21a.json();
  if (res21a.status !== 201) throw new Error(`Create wallet failed: ${JSON.stringify(d21a)}`);

  const res21b = await fetch(`${BASE_URL}/wallets`, { method: 'GET', headers: adminHeaders() });
  const d21b = await res21b.json();
  if (res21b.status !== 200 || d21b.data.length < 2) throw new Error('Wallet list failed');
  console.log('  PASS: Wallet create/list work correctly');

  // ==========================================
  // Test 22: Store isolation
  // ==========================================
  console.log('\nTest 22: Store isolation...');
  const otherStoreId = new mongoose.Types.ObjectId();
  await Store.create({ _id: otherStoreId, name: 'Other Store', settings: { invoiceNextNumber: 1 } });
  const otherUserToken = signToken(new mongoose.Types.ObjectId(), 'admin', otherStoreId);
  const res22 = await fetch(`${BASE_URL}/sales`, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${otherUserToken}` } });
  const d22 = await res22.json();
  if (res22.status !== 200 || d22.data.length !== 0) throw new Error('Store A sales visible to Store B user');
  console.log('  PASS: Store isolation respected');

  console.log('\n==========================================');
  console.log('ALL PHASE 3 INTEGRATION TESTS PASSED!');
  console.log('==========================================');
};

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    await setupData();
    server = app.listen(PORT, async () => {
      console.log(`Server started on port ${PORT}`);
      try {
        await runTests();
        server.close();
        mongoose.connection.close();
        process.exit(0);
      } catch (err) {
        console.error('\nTest suite failed:', err);
        server.close();
        mongoose.connection.close();
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
};

run();
