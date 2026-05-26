const mongoose = require('mongoose');
const Log = require('../modules/admin/log.model');
require('dotenv').config();

const checkLogs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await Log.find({}).sort({ timestamp: 1 });
    console.log(`Total logs found: ${logs.length}`);
    logs.forEach(log => {
      console.log(`[${log.timestamp.toISOString()}] Store: ${log.storeId} | User: ${log.userId} | Action: ${log.action} | Entity: ${log.entity} | Details: ${JSON.stringify(log.details)}`);
    });
    mongoose.connection.close();
  } catch (error) {
    console.error('Error fetching logs:', error);
    mongoose.connection.close();
  }
};

checkLogs();
