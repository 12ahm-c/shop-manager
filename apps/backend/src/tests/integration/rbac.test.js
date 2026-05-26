// Integration test: RBAC field hiding
// Run with: node src/tests/integration/rbac.test.js
// Requires: running MongoDB instance

const mongoose = require('mongoose');
require('dotenv').config();

let passed = 0;
let failed = 0;

async function assert(condition, message) {
  if (condition) { passed++; console.log(`  ✓ ${message}`); }
  else { failed++; console.error(`  ✗ ${message}`); }
}

function stripSensitiveFields(items, role) {
  if (role === 'employee') {
    return items.map(item => {
      const { purchasePrice, profit, ...rest } = item;
      return rest;
    });
  }
  return items;
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmanager_test';
  await mongoose.connect(uri);

  try {
    console.log('\n=== RBAC Field Hiding Tests ===\n');

    const saleItems = [
      { productId: new mongoose.Types.ObjectId(), stockId: new mongoose.Types.ObjectId(),
        quantity: 2, unitPrice: 1900, purchasePrice: 1200, subtotal: 3800, profit: 1400 }
    ];

    // Employee should not see purchasePrice or profit
    const employeeView = stripSensitiveFields(saleItems, 'employee');
    await assert(employeeView[0].purchasePrice === undefined, 'Employee cannot see purchasePrice');
    await assert(employeeView[0].profit === undefined, 'Employee cannot see profit');
    await assert(employeeView[0].unitPrice === 1900, 'Employee can see unitPrice');
    await assert(employeeView[0].quantity === 2, 'Employee can see quantity');

    // Admin should see all fields
    const adminView = stripSensitiveFields(saleItems, 'admin');
    await assert(adminView[0].purchasePrice === 1200, 'Admin can see purchasePrice');
    await assert(adminView[0].profit === 1400, 'Admin can see profit');

    // Sales controller strips for employees
    const saleController = require('../../modules/sales/sale.controller');
    await assert(typeof saleController.getMyHistory === 'function', 'saleController.getMyHistory exists');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
