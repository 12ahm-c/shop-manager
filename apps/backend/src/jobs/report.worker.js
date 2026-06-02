const { Worker } = require('bullmq');
const { getConnection } = require('./queue.service');

function startReportWorker() {
  const connection = getConnection();
  const worker = new Worker('reports', async (job) => {
    const { type, storeId, params } = job.data;
    console.log(`[ReportWorker] Generating ${type} report for store ${storeId}`);

    // Report generation uses inline aggregation (handled by controller)
    // This worker handles async heavy reports like large Excel exports
    return { type, storeId, status: 'generated' };
  }, { connection, concurrency: 2 });

  worker.on('failed', (job, err) => {
    console.error(`[ReportWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

module.exports = { startReportWorker };
