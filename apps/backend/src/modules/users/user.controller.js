const { z } = require('zod');
const User = require('./user.model');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

// Validation schema for PATCH /users/me
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional()
});

// GET /users/me
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -refreshTokenHash');
    if (!user || !user.isActive) {
      return sendError(res, 'NOT_FOUND', 'User not found', null, 404);
    }
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

// PATCH /users/me
const updateProfile = async (req, res, next) => {
  try {
    const parsedData = updateProfileSchema.parse(req.body);

    if (Object.keys(parsedData).length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'At least one field (name, phone) must be provided');
    }

    // Check if phone number is being updated and if it is already taken
    if (parsedData.phone) {
      const existingUser = await User.findOne({
        phone: parsedData.phone,
        _id: { $ne: req.user.id }
      });
      if (existingUser) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Phone number already in use',
          { phone: 'Phone number already in use' },
          409
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: parsedData },
      { new: true, runValidators: true }
    ).select('-passwordHash -refreshTokenHash');

    if (!updatedUser) {
      return sendError(res, 'NOT_FOUND', 'User not found', null, 404);
    }

    return sendSuccess(res, updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
