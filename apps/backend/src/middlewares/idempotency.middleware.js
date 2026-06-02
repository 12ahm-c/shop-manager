const crypto = require('crypto');
const Idempotency = require('../utils/idempotency.model');
const { sendError } = require('../utils/apiResponse');

function hashPayload(payload) {
  // Sort keys to ensure stable hashing for equivalent payloads
  const cleanPayload = sortObjectKeys(payload);
  return crypto.createHash('sha256').update(JSON.stringify(cleanPayload)).digest('hex');
}

function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortObjectKeys(obj[key]);
      return sorted;
    }, {});
}

const checkIdempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) {
    return next();
  }

  try {
    const hash = hashPayload(req.body);
    const cached = await Idempotency.findOne({ key });

    if (cached) {
      if (cached.requestBodyHash !== hash) {
        return sendError(
          res,
          'IDEMPOTENCY_KEY_REUSED',
          'Same key used with different payload',
          null,
          409
        );
      }
      return res.status(cached.responseStatus).json(cached.responseBody);
    }

    // Intercept res.json to save the response on successful operations
    const originalJson = res.json;
    res.json = function (body) {
      res.json = originalJson; // Restore

      if (res.statusCode >= 200 && res.statusCode < 300) {
        Idempotency.create({
          key,
          requestPath: req.originalUrl,
          requestBodyHash: hash,
          responseStatus: res.statusCode,
          responseBody: body
        }).catch(err => console.error('Error storing idempotency record:', err));
      }

      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkIdempotency;
