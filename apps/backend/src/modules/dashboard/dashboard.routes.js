const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const dashboardController = require('./dashboard.controller');

router.get('/employee', authenticate, requireRole('employee', 'admin'), dashboardController.employee);
router.get('/admin', authenticate, requireRole('admin'), dashboardController.admin);
router.get('/financial', authenticate, requireRole('accountant', 'admin'), dashboardController.financial);

module.exports = router;
