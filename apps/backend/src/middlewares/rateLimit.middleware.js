const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'RATE_LIMITED', 'Too many login attempts. Please try again after 15 minutes.', null, 429);
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'RATE_LIMITED', 'Too many requests. Please slow down.', null, 429);
  }
});

const salesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'RATE_LIMITED', 'Too many sale requests. Please slow down.', null, 429);
  }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'RATE_LIMITED', 'Too many AI requests. Please wait before asking another question.', null, 429);
  }
});

module.exports = {
  loginLimiter, apiLimiter, salesLimiter, aiLimiter
};
