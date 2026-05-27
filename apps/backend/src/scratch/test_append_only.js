const mongoose = require('mongoose');
const Log = require('../modules/admin/log.model');
require('dotenv').config();

const testAppendOnly = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Fetch a log
    const log = await Log.findOne({});
    if (!log) {
      console.log('No log entry found to test modification.');
      mongoose.connection.close();
      return;
    }

    console.log('Attempting to update log document...');
    log.action = 'logout'; // change action
    try {
      await log.save();
      console.error('FAIL: Log document was successfully modified!');
    } catch (e) {
      console.log('SUCCESS: Prevented log document update via save(). Error:', e.message);
    }

    console.log('Attempting updateOne...');
    try {
      await Log.updateOne({ _id: log._id }, { action: 'logout' });
      console.error('FAIL: Log document was successfully modified via updateOne!');
    } catch (e) {
      console.log('SUCCESS: Prevented log update via updateOne. Error:', e.message);
    }

    console.log('Attempting deleteOne...');
    try {
      await Log.deleteOne({ _id: log._id });
      console.error('FAIL: Log document was successfully deleted!');
    } catch (e) {
      console.log('SUCCESS: Prevented log deletion. Error:', e.message);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Unexpected error:', error);
    mongoose.connection.close();
  }
};

testAppendOnly();
