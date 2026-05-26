const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const checkIdempotency = require('../../middlewares/idempotency.middleware');
const supplierController = require('./supplier.controller');

router.post('/', authenticate, requireRole('admin'), supplierController.create);
router.get('/', authenticate, requireRole('admin'), supplierController.list);
router.get('/:id/debt', authenticate, requireRole('admin', 'accountant'), supplierController.getDebtDetail);
router.post('/:id/pay', authenticate, requireRole('admin'), checkIdempotency, supplierController.payDebt);

module.exports = router;
