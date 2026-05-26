const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const reportController = require('./report.controller');

router.get('/daily-cash', authenticate, requireRole('admin', 'accountant'), reportController.dailyCash);
router.get('/profitability', authenticate, requireRole('admin', 'accountant'), reportController.profitability);
router.get('/top-products', authenticate, requireRole('admin', 'accountant'), reportController.topProducts);
router.get('/aging', authenticate, requireRole('admin', 'accountant'), reportController.aging);

module.exports = router;
