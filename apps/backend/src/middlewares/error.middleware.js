const { sendError } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Zod Validation Errors
  if (err.name === 'ZodError') {
    const fields = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      fields[path] = error.message;
    });
    return sendError(res, 'VALIDATION_ERROR', 'Validation failed', fields, 400);
  }

  // Token errors
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'TOKEN_EXPIRED', 'Token has expired', null, 401);
  }
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'TOKEN_INVALID', 'Invalid token', null, 401);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const key = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${key}`;
    return sendError(
      res,
      'VALIDATION_ERROR',
      message,
      { [key]: 'Value already exists' },
      409
    );
  }

  // Custom Application Errors
  const statusCode = err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const fields = err.fields || null;

  return sendError(
    res,
    errorCode,
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred'
      : message,
    fields,
    statusCode
  );
};

module.exports = errorHandler;
