const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const checkIdempotency = require('../../middlewares/idempotency.middleware');

// All stock routes require authentication
router.use(authenticate);

// Admin-only endpoints with idempotency check where required
router.post('/receive', requireRole('admin'), checkIdempotency, stockController.receiveStock);
router.post('/adjust', requireRole('admin'), checkIdempotency, stockController.adjustStock);
router.post('/transfer', requireRole('admin'), stockController.transferStock);

// Shared endpoints
router.get('/:productId', requireRole('employee', 'admin', 'accountant'), stockController.listStockLots);

module.exports = router;
