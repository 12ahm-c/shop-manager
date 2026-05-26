// Structured JSON logger
// In production, replace with Pino (npm install pino)

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;

function serializeError(err) {
  if (!err) return {};
  return { message: err.message, stack: err.stack, code: err.code };
}

function log(level, message, meta = {}) {
  if (LEVELS[level] === undefined || LEVELS[level] > currentLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  if (meta.err) {
    entry.err = serializeError(meta.err);
    delete meta.err;
  }

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

function createRequestLogger() {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      log('info', `${req.method} ${req.originalUrl}`, {
        requestId: req.headers['x-request-id'] || '',
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration: Date.now() - start,
        userId: req.user?.id || 'anonymous',
        storeId: req.user?.storeId || 'unknown'
      });
    });
    next();
  };
}

module.exports = { log, createRequestLogger };
