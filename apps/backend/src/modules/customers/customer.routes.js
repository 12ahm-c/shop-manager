const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const customerController = require('./customer.controller');

router.post('/', authenticate, requireRole('employee', 'admin'), customerController.create);
router.get('/search', authenticate, requireRole('employee', 'admin'), customerController.search);
router.get('/:id', authenticate, requireRole('employee', 'admin'), customerController.getById);

module.exports = router;
