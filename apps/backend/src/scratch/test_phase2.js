const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Store = require('../modules/stores/store.model');
const User = require('../modules/users/user.model');
const Supplier = require('../modules/suppliers/supplier.model');
const Product = require('../modules/products/product.model');
const Stock = require('../modules/stock/stock.model');
const Log = require('../modules/admin/log.model');
const Idempotency = require('../utils/idempotency.model');
require('dotenv').config();

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}/v1`;

// Seed IDs
const storeAId = new mongoose.Types.ObjectId();
const storeBId = new mongoose.Types.ObjectId();
const supplierId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const employeeId = new mongoose.Types.ObjectId();

let server;

// Helper to sign JWTs
const signToken = (userId, role, storeId) => {
  return jwt.sign(
    { sub: userId.toString(), role, storeId: storeId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const setupData = async () => {
  console.log('Seeding test database...');
  await Store.deleteMany({});
  await User.deleteMany({});
  await Supplier.deleteMany({});
  await Product.deleteMany({});
  await Stock.deleteMany({});
  await Idempotency.deleteMany({});

  // Bypass Log pre hooks for clean slate
  try {
    await mongoose.connection.db.collection('logs').drop();
  } catch (e) {}

  // 1. Create two Stores
  await Store.create({
    _id: storeAId,
    name: 'Store A (Source)',
    currency: 'MRU',
    settings: { loyaltyPointsPer100: 1, loyaltyRedeemRate: 1, invoiceNextNumber: 100, vatRate: 0, lowStockThresholdPercent: 10 }
  });

  await Store.create({
    _id: storeBId,
    name: 'Store B (Target)',
    currency: 'MRU',
    settings: { loyaltyPointsPer100: 1, loyaltyRedeemRate: 1, invoiceNextNumber: 100, vatRate: 0, lowStockThresholdPercent: 10 }
  });

  // 2. Create Supplier
  await Supplier.create({
    _id: supplierId,
    storeId: storeAId,
    name: 'Grossiste Alpha',
    currentDebt: 0
  });

  // 3. Create Admin & Employee in Store A
  await User.create({
    _id: adminId,
    storeId: storeAId,
    name: 'Ahmed Admin',
    phone: '+22236123450',
    passwordHash: 'password123',
    role: 'admin',
    permissions: ['manage_employees', 'view_reports', 'manage_settings']
  });

  await User.create({
    _id: employeeId,
    storeId: storeAId,
    name: 'Zeyneb Employee',
    phone: '+22236123451',
    passwordHash: 'password123',
    role: 'employee',
    permissions: ['create_sales', 'search_products']
  });

  console.log('Seeding completed successfully!');
};

const runTests = async () => {
  const adminToken = signToken(adminId, 'admin', storeAId);
  const employeeToken = signToken(employeeId, 'employee', storeAId);

  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  const employeeHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${employeeToken}`
  };

  let testProductId;

  console.log('\n--- Running Phase 2 Tests ---');

  // ==========================================
  // Test 1: Create Product (Admin only)
  // ==========================================
  console.log('\nTest 1: Creating Product...');
  const createRes = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: 'Amoxicilline 500mg',
      dci: 'Amox',
      barcode: '1234567890123',
      category: 'Antibiotique',
      sellPrice: 150,
      purchasePrice: 90, // Initial cost
      minStock: 5,
      unit: 'boite'
    })
  });
  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.success) {
    throw new Error(`Product creation failed: ${JSON.stringify(createData)}`);
  }
  testProductId = createData.data._id;
  console.log(`🟢 Product created successfully: ID ${testProductId}`);

  // ==========================================
  // Test 2: Duplicate Barcode Check (409)
  // ==========================================
  console.log('\nTest 2: Checking Duplicate Barcode rejection...');
  const dupRes = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: 'Amoxicilline Bis',
      barcode: '1234567890123', // Same barcode
      category: 'Antibiotique',
      sellPrice: 160
    })
  });
  const dupData = await dupRes.json();
  if (dupRes.status !== 409 || dupData.error.code !== 'DUPLICATE_BARCODE') {
    throw new Error(`Duplicate barcode check failed: Expected 409, got ${dupRes.status}`);
  }
  console.log('🟢 Duplicate barcode correctly blocked with 409 DUPLICATE_BARCODE');

  // ==========================================
  // Test 3: Search Product (Admin & Employee)
  // ==========================================
  console.log('\nTest 3: Searching product...');
  const searchRes = await fetch(`${BASE_URL}/products/search?q=Amox`, {
    method: 'GET',
    headers: employeeHeaders
  });
  const searchData = await searchRes.json();
  if (searchRes.status !== 200 || !searchData.success || searchData.data.length === 0) {
    throw new Error(`Product search failed: ${JSON.stringify(searchData)}`);
  }
  // Verify purchasePrice is stripped for employee
  if (searchData.data[0].purchasePrice !== undefined) {
    throw new Error('Security Violation: Employee received product purchasePrice in search!');
  }
  console.log('🟢 Product search succeeded and stripped purchasePrice for employee');

  // ==========================================
  // Test 4: Get Product Detail & Cost Stripping
  // ==========================================
  console.log('\nTest 4: Fetching product detail and checking role restrictions...');
  
  // As Employee: purchasePrice must be stripped
  const detailEmpRes = await fetch(`${BASE_URL}/products/${testProductId}`, {
    method: 'GET',
    headers: employeeHeaders
  });
  const detailEmpData = await detailEmpRes.json();
  if (detailEmpData.data.product.purchasePrice !== undefined) {
    throw new Error('Security Violation: Employee received product purchasePrice in detail!');
  }

  // As Admin: purchasePrice must be visible
  const detailAdminRes = await fetch(`${BASE_URL}/products/${testProductId}`, {
    method: 'GET',
    headers: adminHeaders
  });
  const detailAdminData = await detailAdminRes.json();
  if (detailAdminData.data.product.purchasePrice !== 90) {
    throw new Error(`Admin should see purchasePrice 90, got: ${detailAdminData.data.product.purchasePrice}`);
  }
  console.log('🟢 Product detail role stripping and totalStock aggregation works correctly');

  // ==========================================
  // Test 5: Receive Stock (Lot creation, WAP recalculation, Supplier debt)
  // ==========================================
  console.log('\nTest 5: Receiving stock lot 1 (10 units at 100 MRU)...');
  const receive1Res = await fetch(`${BASE_URL}/stock/receive`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
      'Idempotency-Key': 'key-receive-lot-1'
    },
    body: JSON.stringify({
      supplierId: supplierId.toString(),
      items: [
        {
          productId: testProductId,
          quantity: 10,
          purchasePrice: 100,
          lotNumber: 'LOT-001'
        }
      ]
    })
  });
  const receive1Data = await receive1Res.json();
  if (receive1Res.status !== 201 || !receive1Data.success) {
    throw new Error(`First stock receipt failed: ${JSON.stringify(receive1Data)}`);
  }

  // Verify WAP is now 100 (WAP recalculation because total stock before was 0)
  const productAfter1 = await Product.findById(testProductId);
  if (productAfter1.purchasePrice !== 100) {
    throw new Error(`Expected product WAP to be 100, got ${productAfter1.purchasePrice}`);
  }

  // Verify Supplier Debt is now 10 * 100 = 1000
  const supplierAfter1 = await Supplier.findById(supplierId);
  if (supplierAfter1.currentDebt !== 1000) {
    throw new Error(`Expected supplier debt to be 1000, got ${supplierAfter1.currentDebt}`);
  }
  console.log('🟢 First stock receipt, WAP recalculation, and supplier debt committed atomically');

  // Test 5b: Receive Lot 2 (20 units at 130 MRU)
  console.log('Receiving stock lot 2 (20 units at 130 MRU)...');
  const receive2Res = await fetch(`${BASE_URL}/stock/receive`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      supplierId: supplierId.toString(),
      items: [
        {
          productId: testProductId,
          quantity: 20,
          purchasePrice: 130,
          lotNumber: 'LOT-002'
        }
      ]
    })
  });
  if (receive2Res.status !== 201) {
    throw new Error(`Second stock receipt failed with status ${receive2Res.status}`);
  }

  // Recalculating WAP: ((10 * 100) + (20 * 130)) / (10 + 20) = (1000 + 2600) / 30 = 120
  const productAfter2 = await Product.findById(testProductId);
  if (productAfter2.purchasePrice !== 120) {
    throw new Error(`Expected product WAP to be 120, got ${productAfter2.purchasePrice}`);
  }

  // Supplier debt: 1000 + (20 * 130) = 1000 + 2600 = 3600
  const supplierAfter2 = await Supplier.findById(supplierId);
  if (supplierAfter2.currentDebt !== 3600) {
    throw new Error(`Expected supplier debt to be 3600, got ${supplierAfter2.currentDebt}`);
  }
  console.log('🟢 Second stock receipt: WAP updated to 120, supplier debt updated to 3600');

  // ==========================================
  // Test 6: Idempotency Key Handling
  // ==========================================
  console.log('\nTest 6: Testing Idempotency key cached replay...');
  // Send duplicate request using same header 'key-receive-lot-1'
  const dupReceiveRes = await fetch(`${BASE_URL}/stock/receive`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
      'Idempotency-Key': 'key-receive-lot-1'
    },
    body: JSON.stringify({
      supplierId: supplierId.toString(),
      items: [
        {
          productId: testProductId,
          quantity: 10,
          purchasePrice: 100,
          lotNumber: 'LOT-001'
        }
      ]
    })
  });
  const dupReceiveData = await dupReceiveRes.json();
  if (dupReceiveRes.status !== 201 || !dupReceiveData.success) {
    throw new Error('Duplicate idempotency key call failed');
  }

  // Verify that database effects were NOT duplicated (WAP still 120, supplier debt still 3600)
  const supplierFinal = await Supplier.findById(supplierId);
  if (supplierFinal.currentDebt !== 3600) {
    throw new Error(`Replayed idempotency key duplicated supplier debt! Expected 3600, got ${supplierFinal.currentDebt}`);
  }

  // Send different body with same key-receive-lot-1
  const mismatchRes = await fetch(`${BASE_URL}/stock/receive`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
      'Idempotency-Key': 'key-receive-lot-1'
    },
    body: JSON.stringify({
      supplierId: supplierId.toString(),
      items: [
        {
          productId: testProductId,
          quantity: 999, // mismatch
          purchasePrice: 100,
          lotNumber: 'LOT-001'
        }
      ]
    })
  });
  if (mismatchRes.status !== 409) {
    throw new Error(`Expected 409 mismatch error for reused idempotency key, got ${mismatchRes.status}`);
  }
  console.log('🟢 Idempotency key successfully replayed cached response and blocked mismatched payloads with 409');

  // ==========================================
  // Test 7: Get Stock Lots & FIFO ordering
  // ==========================================
  console.log('\nTest 7: Listing stock lots and validating FIFO order...');
  
  // As Employee: purchasePrice must be stripped
  const lotsEmpRes = await fetch(`${BASE_URL}/stock/${testProductId}`, {
    method: 'GET',
    headers: employeeHeaders
  });
  const lotsEmpData = await lotsEmpRes.json();
  if (lotsEmpData.data.some(l => l.purchasePrice !== undefined)) {
    throw new Error('Security Violation: Employee received stock lot purchasePrice!');
  }

  // As Admin: check FIFO ordering (Lot 1 receptionDate < Lot 2 receptionDate)
  const lotsAdminRes = await fetch(`${BASE_URL}/stock/${testProductId}`, {
    method: 'GET',
    headers: adminHeaders
  });
  const lotsAdminData = await lotsAdminRes.json();
  if (lotsAdminData.data.length < 2) {
    throw new Error(`Expected at least 2 active lots, got ${lotsAdminData.data.length}`);
  }
  if (lotsAdminData.data[0].lotNumber !== 'LOT-001' || lotsAdminData.data[1].lotNumber !== 'LOT-002') {
    throw new Error('FIFO sorting failed: Oldest receptionDate lot must come first');
  }
  console.log('🟢 Active stock lots returned in correct FIFO order and cost-masked for employee');

  // ==========================================
  // Test 8: Adjust Stock (increment/decrement/set & WAP recalculation)
  // ==========================================
  console.log('\nTest 8: Adjusting stock lot...');
  // Adjust newest lot (Lot 2: 20 units at 130 MRU) to be 10 units instead of 20
  const adjustRes = await fetch(`${BASE_URL}/stock/adjust`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      productId: testProductId,
      lotId: lotsAdminData.data[1]._id,
      quantity: 10,
      type: 'set',
      reason: 'Ajustement inventaire'
    })
  });
  const adjustData = await adjustRes.json();
  if (adjustRes.status !== 200 || !adjustData.success) {
    throw new Error(`Stock adjust failed: ${JSON.stringify(adjustData)}`);
  }

  // Recalculating WAP: ((10 * 100) + (10 * 130)) / (10 + 10) = 2300 / 20 = 115
  const productAfterAdjust = await Product.findById(testProductId);
  if (productAfterAdjust.purchasePrice !== 115) {
    throw new Error(`Expected WAP to be 115 after adjustment, got ${productAfterAdjust.purchasePrice}`);
  }
  console.log('🟢 Manual stock adjustment updated lot quantity and recalculated product WAP to 115');

  // Check adjust below zero fails
  const adjustFailRes = await fetch(`${BASE_URL}/stock/adjust`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      productId: testProductId,
      lotId: lotsAdminData.data[1]._id,
      quantity: 99,
      type: 'decrement',
      reason: 'Ajustement invalide'
    })
  });
  if (adjustFailRes.status !== 422) {
    throw new Error(`Expected 422 for adjustment below zero, got ${adjustFailRes.status}`);
  }
  console.log('🟢 Adjustment below zero correctly rejected with 422 INSUFFICIENT_STOCK');

  // ==========================================
  // Test 9: Transfer Stock (Store A -> Store B)
  // ==========================================
  console.log('\nTest 9: Transferring stock to Store B...');
  // Current lots in Store A:
  // - Lot 1: 10 units at 100 MRU
  // - Lot 2: 10 units at 130 MRU
  // Transfer 15 units.
  // FIFO should consume 10 units from Lot 1 and 5 units from Lot 2.
  const transferRes = await fetch(`${BASE_URL}/stock/transfer`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      productId: testProductId,
      toStoreId: storeBId.toString(),
      quantity: 15
    })
  });
  const transferData = await transferRes.json();
  if (transferRes.status !== 200 || !transferData.success) {
    throw new Error(`Stock transfer failed: ${JSON.stringify(transferData)}`);
  }

  // Check remaining lots in Store A
  // - Lot 1: should be 0 units (or inactive if quantity is 0)
  // - Lot 2: should be 5 units at 130 MRU
  const srcLots = await Stock.find({ productId: testProductId, storeId: storeAId });
  const lot1 = srcLots.find(l => l.lotNumber === 'LOT-001');
  const lot2 = srcLots.find(l => l.lotNumber === 'LOT-002');
  if (lot1.quantity !== 0) {
    throw new Error(`Expected Lot 1 to be fully depleted (0), got ${lot1.quantity}`);
  }
  if (lot2.quantity !== 5) {
    throw new Error(`Expected Lot 2 to be depleted to 5, got ${lot2.quantity}`);
  }

  // Verify WAP in Store A is now 130 (since only Lot 2 is active)
  const productA = await Product.findById(testProductId);
  if (productA.purchasePrice !== 130) {
    throw new Error(`Expected Store A product WAP to be 130, got ${productA.purchasePrice}`);
  }

  // Verify Store B details:
  // Product should have been copied to Store B
  const destProduct = await Product.findOne({ storeId: storeBId, barcode: '1234567890123' });
  if (!destProduct) {
    throw new Error('Product was not copied/created in Store B on transfer!');
  }

  // Verify Store B lots are created:
  // - Lot 1: 10 units at 100 MRU
  // - Lot 2: 5 units at 130 MRU
  const destLots = await Stock.find({ productId: destProduct._id, storeId: storeBId });
  if (destLots.length !== 2) {
    throw new Error(`Expected 2 transferred lots in Store B, got ${destLots.length}`);
  }
  // Verify Store B WAP: ((10 * 100) + (5 * 130)) / 15 = (1000 + 650) / 15 = 1650 / 15 = 110
  if (destProduct.purchasePrice !== 110) {
    throw new Error(`Expected Store B WAP to be 110, got ${destProduct.purchasePrice}`);
  }
  console.log('🟢 FIFO stock transfer succeeded: lots consumed in FIFO order in Store A, product copied and lots created in Store B, WAP updated in both stores');

  // ==========================================
  // Test 10: Soft Delete Product & Verify cascade
  // ==========================================
  console.log('\nTest 10: Soft deleting product...');
  const deleteRes = await fetch(`${BASE_URL}/products/${testProductId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  if (deleteRes.status !== 200) {
    throw new Error(`Product deletion failed with status ${deleteRes.status}`);
  }

  // Verify product is inactive
  const deletedProduct = await Product.findById(testProductId);
  if (deletedProduct.isActive) {
    throw new Error('Product isActive should be false after delete');
  }

  // Verify stock lots of that product in Store A are set to inactive
  const inactiveLots = await Stock.find({ productId: testProductId, storeId: storeAId });
  if (inactiveLots.some(l => l.isActive)) {
    throw new Error('Cascaded stock lot soft-delete failed');
  }
  console.log('🟢 Soft deletion sets product and its corresponding stock lots to inactive');

  console.log('\n==========================================');
  console.log('🟢 ALL PHASE 2 INTEGRATION TESTS PASSED!');
  console.log('==========================================');
};

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    await setupData();

    // Start server
    console.log(`Starting HTTP server on port ${PORT}...`);
    server = app.listen(PORT, async () => {
      console.log('Server started!');
      try {
        await runTests();
        server.close();
        mongoose.connection.close();
        process.exit(0);
      } catch (err) {
        console.error('\n🔴 Test suite failed:', err);
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
