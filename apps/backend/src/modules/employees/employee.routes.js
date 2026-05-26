const express = require('express');
const router = express.Router();
const employeeController = require('./employee.controller');
const authenticate = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');

// All employee administration routes require authenticate and admin role
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', employeeController.listEmployees);
router.post('/', employeeController.createEmployee);
router.patch('/:id', employeeController.updateEmployee);

module.exports = router;
