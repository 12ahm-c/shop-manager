const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const notifController = require('./notification.controller');

router.get('/me', authenticate, requireRole('employee', 'admin', 'accountant'), notifController.getMyNotifications);
router.patch('/:id/read', authenticate, requireRole('admin', 'employee', 'accountant'), notifController.markOneRead);
router.patch('/read-all', authenticate, requireRole('employee', 'admin', 'accountant'), notifController.markAllRead);

module.exports = router;
