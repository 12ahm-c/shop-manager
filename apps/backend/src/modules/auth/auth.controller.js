const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../users/user.model');
const Store = require('../stores/store.model');
const Log = require('../admin/log.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

// Helper to hash token
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate Access Token (15m)
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      storeId: user.storeId.toString()
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate Refresh Token (7d)
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString()
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /auth/login
const login = async (req, res, next) => {
  try {
    const { phone, password, storeId } = req.body;

    if (!phone || !password || !storeId) {
      return sendError(res, 'VALIDATION_ERROR', 'Phone, password, and storeId are required', {
        phone: !phone ? 'Required' : null,
        password: !password ? 'Required' : null,
        storeId: !storeId ? 'Required' : null
      });
    }

    // Find store
    const store = await Store.findOne({ _id: storeId, isActive: true });
    if (!store) {
      return sendError(res, 'NOT_FOUND', 'Store not found or inactive', null, 404);
    }

    // Find active user in that store
    const user = await User.findOne({ phone, storeId, isActive: true });
    if (!user) {
      return sendError(res, 'AUTH_FAILED', 'Invalid phone number or password', null, 401);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'AUTH_FAILED', 'Invalid phone number or password', null, 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token hash
    user.refreshTokenHash = hashToken(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    // Create Audit Log
    await Log.create({
      storeId: user.storeId,
      userId: user._id,
      action: 'login',
      entity: 'User',
      entityId: user._id,
      details: { phone: user.phone },
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        role: user.role
      },
      store: {
        _id: store._id,
        name: store.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'VALIDATION_ERROR', 'Refresh token is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return sendError(res, 'TOKEN_INVALID', 'Invalid or expired refresh token', null, 401);
    }

    // Find user
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return sendError(res, 'TOKEN_INVALID', 'User not found or inactive', null, 401);
    }

    // Check refresh token hash
    const currentHash = hashToken(refreshToken);
    if (user.refreshTokenHash !== currentHash) {
      // Refresh token reuse detected or token revoked -> Revoke all session access
      user.refreshTokenHash = null;
      await user.save();
      return sendError(res, 'TOKEN_INVALID', 'Refresh token has been reused or revoked', null, 401);
    }

    // Generate new tokens (rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    return sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/logout
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokenHash = null;
      await user.save();

      // Create Audit Log
      await Log.create({
        storeId: user.storeId,
        userId: user._id,
        action: 'logout',
        entity: 'User',
        entityId: user._id,
        details: {},
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
    }

    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /auth/me
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -refreshTokenHash');
    if (!user || !user.isActive) {
      return sendError(res, 'NOT_FOUND', 'User not found', null, 404);
    }

    const store = await Store.findById(req.user.storeId);
    if (!store) {
      return sendError(res, 'NOT_FOUND', 'Associated store not found', null, 404);
    }

    return sendSuccess(res, {
      user,
      store,
      permissions: user.permissions || []
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  me
};
