const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const checkIdempotency = require('../../middlewares/idempotency.middleware');
const customerController = require('./customer.controller');

router.post('/', authenticate, requireRole('employee', 'admin'), customerController.create);
router.get('/search', authenticate, requireRole('employee', 'admin'), customerController.search);
router.get('/debt/overdue', authenticate, requireRole('admin'), customerController.getOverdue);
router.post('/:id/debt/pay', authenticate, requireRole('employee', 'admin'), checkIdempotency, customerController.payDebt);
router.post('/:id/loyalty/redeem', authenticate, requireRole('employee', 'admin'), customerController.redeemLoyalty);
router.get('/:id', authenticate, requireRole('employee', 'admin'), customerController.getById);

module.exports = router;
