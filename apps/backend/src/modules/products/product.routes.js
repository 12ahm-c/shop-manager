const express = require('express');
const router = express.Router();
const productController = require('./product.controller');
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');

// All product routes require authentication
router.use(authenticate);

// Admin-only endpoints
router.post('/', requireRole('admin'), productController.createProduct);
router.put('/:id', requireRole('admin'), productController.updateProduct);
router.delete('/:id', requireRole('admin'), productController.deleteProduct);
router.post('/import', requireRole('admin'), productController.importProducts);

// Shared endpoints (Employee/Admin/Accountant)
router.get('/search', requireRole('employee', 'admin', 'accountant'), productController.searchProducts);
router.get('/:id', requireRole('employee', 'admin', 'accountant'), productController.getProductDetail);

module.exports = router;
