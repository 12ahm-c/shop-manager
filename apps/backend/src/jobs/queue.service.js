const { Queue } = require('bullmq');
const IORedis = require('ioredis');

let connection = null;
let queues = {};

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

function getQueue(name) {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: getConnection() });
  }
  return queues[name];
}

async function addJob(queueName, jobName, data, opts = {}) {
  const queue = getQueue(queueName);
  return queue.add(jobName, data, {
    attempts: opts.attempts || 3,
    backoff: { type: 'exponential', delay: opts.backoffDelay || 2000 },
    ...opts
  });
}

async function addInvoiceJob(data) {
  return addJob('invoice-generation', 'generate', data, { attempts: 5, backoffDelay: 2000 });
}

async function addWhatsAppJob(data) {
  return addJob('whatsapp', 'send', data, { attempts: 5, backoffDelay: 5000 });
}

async function addEmailJob(data) {
  return addJob('email', 'send', data, { attempts: 5, backoffDelay: 5000 });
}

async function addReportJob(data) {
  return addJob('reports', 'generate', data, { attempts: 3, backoffDelay: 5000 });
}

async function addBackupJob(data) {
  return addJob('backup', 'backup', data, { attempts: 2, backoffDelay: 10000 });
}

module.exports = {
  getConnection, getQueue, addJob,
  addInvoiceJob, addWhatsAppJob, addEmailJob, addReportJob, addBackupJob
};
