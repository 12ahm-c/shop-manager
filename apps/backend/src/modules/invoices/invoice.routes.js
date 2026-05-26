const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const invoiceController = require('./invoice.controller');

router.get('/sale/:saleId', authenticate, requireRole('employee', 'admin', 'accountant'), invoiceController.getBySaleId);
router.post('/:id/resend', authenticate, requireRole('employee', 'admin'), invoiceController.resend);
router.get('/:id', authenticate, requireRole('employee', 'admin', 'accountant'), invoiceController.getById);

module.exports = router;
