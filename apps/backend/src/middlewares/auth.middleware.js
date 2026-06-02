const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/apiResponse');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'AUTH_REQUIRED', 'Authentication token required', null, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      storeId: decoded.storeId
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'TOKEN_EXPIRED', 'Token has expired', null, 401);
    }
    return sendError(res, 'TOKEN_INVALID', 'Invalid token', null, 401);
  }
};

module.exports = authenticate;
