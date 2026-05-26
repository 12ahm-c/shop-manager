const { z } = require('zod');
const mongoose = require('mongoose');
const Employee = require('./employee.model');
const User = require('../users/user.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

// Validation schemas
const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  position: z.string().min(1, 'Position is required'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['admin', 'employee', 'accountant']),
  salary: z.number().nonnegative().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  emergencyContact: z
    .object({
      name: z.string().default(''),
      phone: z.string().default('')
    })
    .optional(),
  permissions: z.array(z.string()).optional()
});

const updateEmployeeSchema = z.object({
  position: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  role: z.enum(['admin', 'employee', 'accountant']).optional(),
  salary: z.number().nonnegative().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional()
    })
    .optional(),
  permissions: z.array(z.string()).optional()
});

// GET /admin/employees
const listEmployees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Enforce store isolation: filter by storeId
    const query = { storeId: req.user.storeId };

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate({
        path: 'userId',
        select: '-passwordHash -refreshTokenHash'
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return sendSuccess(res, employees, {
      page,
      limit,
      total,
      hasMore: skip + employees.length < total
    });
  } catch (error) {
    next(error);
  }
};

// POST /admin/employees
const createEmployee = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parsedData = createEmployeeSchema.parse(req.body);

    // Enforce storeId isolation
    const storeId = req.user.storeId;

    // Check if employeeNumber is unique
    const existingEmployeeNum = await Employee.findOne({ employeeNumber: parsedData.employeeNumber });
    if (existingEmployeeNum) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Employee number already in use',
        { employeeNumber: 'Employee number already exists' },
        409
      );
    }

    // Check if user phone number is unique
    const existingUserPhone = await User.findOne({ phone: parsedData.phone });
    if (existingUserPhone) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Phone number already in use',
        { phone: 'Phone number already in use' },
        409
      );
    }

    // 1. Create User
    const [user] = await User.create(
      [
        {
          storeId,
          name: parsedData.name,
          phone: parsedData.phone,
          passwordHash: parsedData.password, // hashed automatically by model hook
          role: parsedData.role,
          permissions: parsedData.permissions || []
        }
      ],
      { session }
    );

    // 2. Create Employee
    const [employee] = await Employee.create(
      [
        {
          storeId,
          userId: user._id,
          employeeNumber: parsedData.employeeNumber,
          position: parsedData.position,
          salary: parsedData.salary,
          commissionRate: parsedData.commissionRate,
          emergencyContact: parsedData.emergencyContact
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Populate user before sending back
    const result = await Employee.findById(employee._id).populate({
      path: 'userId',
      select: '-passwordHash -refreshTokenHash'
    });

    return sendSuccess(res, result, null, 201);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// PATCH /admin/employees/:id
const updateEmployee = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const parsedData = updateEmployeeSchema.parse(req.body);

    // Find Employee ensuring store isolation
    const employee = await Employee.findOne({ _id: id, storeId: req.user.storeId }).session(session);
    if (!employee) {
      return sendError(res, 'NOT_FOUND', 'Employee not found', null, 404);
    }

    // Prepare Employee and User update fields
    const employeeUpdates = {};
    const userUpdates = {};

    if (parsedData.position !== undefined) employeeUpdates.position = parsedData.position;
    if (parsedData.salary !== undefined) employeeUpdates.salary = parsedData.salary;
    if (parsedData.commissionRate !== undefined) employeeUpdates.commissionRate = parsedData.commissionRate;
    if (parsedData.isActive !== undefined) employeeUpdates.isActive = parsedData.isActive;
    if (parsedData.emergencyContact !== undefined) employeeUpdates.emergencyContact = parsedData.emergencyContact;

    if (parsedData.name !== undefined) userUpdates.name = parsedData.name;
    if (parsedData.role !== undefined) userUpdates.role = parsedData.role;
    if (parsedData.isActive !== undefined) userUpdates.isActive = parsedData.isActive;
    if (parsedData.permissions !== undefined) userUpdates.permissions = parsedData.permissions;

    if (parsedData.phone !== undefined) {
      // Check phone uniqueness
      const existingUserPhone = await User.findOne({
        phone: parsedData.phone,
        _id: { $ne: employee.userId }
      }).session(session);
      if (existingUserPhone) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Phone number already in use',
          { phone: 'Phone number already in use' },
          409
        );
      }
      userUpdates.phone = parsedData.phone;
    }

    // 1. Update Employee details if needed
    if (Object.keys(employeeUpdates).length > 0) {
      await Employee.findByIdAndUpdate(id, { $set: employeeUpdates }, { session, runValidators: true });
    }

    // 2. Update User details if needed (if user account exists)
    if (employee.userId && Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(employee.userId, { $set: userUpdates }, { session, runValidators: true });
    }

    await session.commitTransaction();
    session.endSession();

    // Fetch updated record populated with user details
    const result = await Employee.findById(id).populate({
      path: 'userId',
      select: '-passwordHash -refreshTokenHash'
    });

    return sendSuccess(res, result);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

module.exports = {
  listEmployees,
  createEmployee,
  updateEmployee
};
