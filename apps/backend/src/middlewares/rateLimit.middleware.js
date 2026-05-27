const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    return sendError(
      res,
      'RATE_LIMITED',
      'Too many login attempts. Please try again after 15 minutes.',
      null,
      429
    );
  }
});

module.exports = {
  loginLimiter
};
