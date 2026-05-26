const mongoose = require('mongoose');
const Store = require('../modules/stores/store.model');
const User = require('../modules/users/user.model');
const Employee = require('../modules/employees/employee.model');
const Log = require('../modules/admin/log.model');
require('dotenv').config();

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // Clear existing data (only for the models we are using in Phase 1)
    console.log('Cleaning up old records...');
    await Store.deleteMany({});
    await User.deleteMany({});
    await Employee.deleteMany({});
    // We bypass Log model pre hooks for deletion by calling direct driver level collection drop
    try {
      await mongoose.connection.db.collection('logs').drop();
      console.log('Cleared logs collection directly.');
    } catch (e) {
      console.log('Logs collection already empty or missing.');
    }

    // 1. Create a Store
    console.log('Seeding Store...');
    const store = await Store.create({
      name: 'Magasin Central',
      logo: 'http://example.com/logo.png',
      address: 'Nouakchott, Mauritanie',
      phone: '+22245250000',
      email: 'contact@magasincentral.mr',
      taxId: 'T12345678',
      currency: 'MRU',
      settings: {
        loyaltyPointsPer100: 1,
        loyaltyRedeemRate: 1,
        invoiceNextNumber: 100,
        vatRate: 15,
        lowStockThresholdPercent: 10
      }
    });
    console.log(`Store created: ${store.name} (${store._id})`);

    // 2. Create Admin User
    console.log('Seeding Admin User...');
    const adminUser = await User.create({
      storeId: store._id,
      name: 'Ahmed Admin',
      phone: '+22236123456',
      passwordHash: 'password123', // will be hashed automatically by model hook
      role: 'admin',
      permissions: ['manage_employees', 'view_reports', 'manage_settings']
    });
    console.log(`Admin User created: ${adminUser.name} (${adminUser._id})`);

    // 3. Create Employee User & Employee HR record
    console.log('Seeding Employee User...');
    const employeeUser = await User.create({
      storeId: store._id,
      name: 'Zeyneb Employee',
      phone: '+22236123457',
      passwordHash: 'password123',
      role: 'employee',
      permissions: ['create_sales', 'search_products']
    });
    console.log(`Employee User created: ${employeeUser.name} (${employeeUser._id})`);

    console.log('Seeding Employee HR Document...');
    const employeeHr = await Employee.create({
      storeId: store._id,
      userId: employeeUser._id,
      employeeNumber: 'EMP001',
      position: 'caissier',
      salary: 15000,
      commissionRate: 0.02,
      emergencyContact: {
        name: 'Mohamed Contact',
        phone: '+22236123458'
      }
    });
    console.log(`Employee HR Document created: ${employeeHr.employeeNumber} (${employeeHr._id})`);

    console.log('Seeding successfully completed!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding failed:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seed();
