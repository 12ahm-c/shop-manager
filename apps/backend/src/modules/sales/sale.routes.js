const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const checkIdempotency = require('../../middlewares/idempotency.middleware');
const saleController = require('./sale.controller');

router.post('/', authenticate, requireRole('employee', 'admin'), checkIdempotency, saleController.create);
router.get('/me/daily', authenticate, requireRole('employee', 'admin'), saleController.getDailySummary);
router.get('/me/history', authenticate, requireRole('employee', 'admin'), saleController.getMyHistory);
router.get('/:id', authenticate, requireRole('employee', 'admin'), saleController.getById);
router.get('/', authenticate, requireRole('admin', 'accountant'), saleController.list);
router.post('/:id/cancel', authenticate, requireRole('admin'), saleController.cancel);

module.exports = router;
