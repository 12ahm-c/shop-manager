const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const walletController = require('./wallet.controller');

router.post('/', authenticate, requireRole('admin'), walletController.create);
router.get('/', authenticate, requireRole('admin', 'accountant'), walletController.list);

module.exports = router;
