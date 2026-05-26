const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const aiController = require('./ai.controller');

router.post('/chat', authenticate, requireRole('employee', 'admin'), aiController.chat);
router.get('/suggestions', authenticate, requireRole('employee', 'admin'), aiController.suggestions);
router.get('/health', authenticate, requireRole('admin'), aiController.health);

module.exports = router;
