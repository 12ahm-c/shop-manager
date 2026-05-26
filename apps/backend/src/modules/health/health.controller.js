const mongoose = require('mongoose');
const { sendSuccess } = require('../../utils/apiResponse');

const status = async (req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    let redisStatus = 'not_configured';
    try {
      const IORedis = require('ioredis');
      const testClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        retryStrategy: () => null,
        maxRetriesPerRequest: 1
      });
      await testClient.connect();
      await testClient.ping();
      redisStatus = 'connected';
      await testClient.disconnect();
    } catch {
      redisStatus = 'unreachable';
    }

    return sendSuccess(res, {
      status: dbState === 1 ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      components: {
        database: dbStatus[dbState] || 'unknown',
        redis: redisStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { status };
