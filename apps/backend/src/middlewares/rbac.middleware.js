const { sendError } = require('../utils/apiResponse');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'AUTH_REQUIRED', 'Authentication required', null, 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'FORBIDDEN', 'Access denied. Insufficient permissions.', null, 403);
    }

    next();
  };
};

module.exports = requireRole;
