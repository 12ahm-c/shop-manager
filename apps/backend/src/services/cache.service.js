// Redis-backed cache service for dashboards and frequently accessed data

const IORedis = require('ioredis');

let client = null;

function getClient() {
  if (!client) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new IORedis(REDIS_URL, {
      lazyConnect: true,
      retryStrategy: () => null,
      maxRetriesPerRequest: 1
    });
    client.on('error', () => {});
  }
  return client;
}

const DEFAULT_TTL = 5 * 60;

async function get(key) {
  try {
    const c = getClient();
    const data = await c.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function set(key, value, ttlSeconds = DEFAULT_TTL) {
  try {
    const c = getClient();
    await c.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // cache unavailable — non-critical
  }
}

async function del(key) {
  try {
    const c = getClient();
    await c.del(key);
  } catch {
    // cache unavailable — non-critical
  }
}

async function invalidateDashboard(storeId) {
  await del(`dashboard:admin:${storeId}`);
  await del(`dashboard:financial:${storeId}`);
}

function dashboardKey(storeId, period) {
  return `dashboard:admin:${storeId}:${period || 'today'}`;
}

function financialKey(storeId) {
  return `dashboard:financial:${storeId}`;
}

module.exports = { get, set, del, invalidateDashboard, dashboardKey, financialKey };
