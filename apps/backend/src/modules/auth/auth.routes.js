const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authenticate = require('../../middlewares/auth.middleware');
const { loginLimiter } = require('../../middlewares/rateLimit.middleware');

// Public routes
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refresh);

// Authenticated routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
