const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const checkIdempotency = require('../../middlewares/idempotency.middleware');
const walletController = require('./wallet.controller');

router.post('/', authenticate, requireRole('admin'), walletController.create);
router.get('/', authenticate, requireRole('admin', 'accountant'), walletController.list);
router.post('/transfer', authenticate, requireRole('admin'), checkIdempotency, walletController.transfer);
router.get('/:id/transactions', authenticate, requireRole('admin', 'accountant'), walletController.getTransactions);
router.post('/:id/reconcile', authenticate, requireRole('accountant'), walletController.reconcile);

module.exports = router;
