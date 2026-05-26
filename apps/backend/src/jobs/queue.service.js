const { Queue } = require('bullmq');
const IORedis = require('ioredis');

let connection = null;
let invoiceQueue = null;

function getConnection() {
  if (!connection) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null
    });
  }
  return connection;
}

function getInvoiceQueue() {
  if (!invoiceQueue) {
    invoiceQueue = new Queue('invoice-generation', { connection: getConnection() });
  }
  return invoiceQueue;
}

async function addInvoiceJob(data) {
  const queue = getInvoiceQueue();
  return queue.add('generate', data, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 }
  });
}

module.exports = { getConnection, getInvoiceQueue, addInvoiceJob };
