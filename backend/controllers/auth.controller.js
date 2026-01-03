const User = require("../models/User");
const {
  generateToken,
  setTokenCookie,
  clearTokenCookie,
} = require("../config/auth");
const {
  HTTP_STATUS,
  RESPONSE_MESSAGES,
  USER_ROLES,
} = require("../config/constants");
const { asyncHandler, AppError } = require("../middleware/error.middleware");
const logger = require("../utils/logger");

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.USER_EXISTS,
      HTTP_STATUS.CONFLICT
    );
  }

  // Validate staff requirements
  if (role === USER_ROLES.STAFF && !department) {
    throw new AppError(
      "Department is required for staff members",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Only admin can create admin accounts
  if (role === USER_ROLES.ADMIN) {
    throw new AppError(
      "Admin accounts can only be created by existing admins",
      HTTP_STATUS.FORBIDDEN
    );
  }

  try {
    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || USER_ROLES.USER,
      department: role === USER_ROLES.STAFF ? department : undefined,
    });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Set secure cookie
    setTokenCookie(res, token);

    // Update last login
    await user.updateLastLogin();

    logger.info(`New user registered: ${user.email} with role: ${user.role}`);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.USER_REGISTERED,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt,
      },
      token, // Also send in response for mobile clients
    });
  } catch (error) {
    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      throw new AppError(messages.join(", "), HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user and include password for verification
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      throw new AppError(
        RESPONSE_MESSAGES.ERROR.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError(
        "Account has been deactivated. Please contact administrator.",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      logger.warn(`Failed login attempt for email: ${email}`);
      throw new AppError(
        RESPONSE_MESSAGES.ERROR.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Set secure cookie
    setTokenCookie(res, token);

    // Update last login
    await user.updateLastLogin();

    logger.info(`User logged in: ${user.email}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.USER_LOGIN,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        lastLogin: user.lastLogin,
      },
      token, // Also send in response for mobile clients
    });
  } catch (error) {
    throw error;
  }
});

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Clear the token cookie
  clearTokenCookie(res);

  logger.info(`User logged out: ${req.user?.email || "Unknown"}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.SUCCESS.USER_LOGOUT,
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  // User is available from auth middleware
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    },
  });
});

/**
 * @desc    Update user password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError(
      "Current password and new password are required",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (newPassword.length < 6) {
    throw new AppError(
      "New password must be at least 6 characters long",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Get user with password
  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Check current password
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordCorrect) {
    throw new AppError(
      "Current password is incorrect",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password updated for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Password updated successfully",
  });
});

/**
 * @desc    Refresh JWT token
 * @route   POST /api/auth/refresh
 * @access  Private
 */
const refreshToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user || !user.isActive) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Generate new token
  const token = generateToken(user._id, user.role);

  // Set new cookie
  setTokenCookie(res, token);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Token refreshed successfully",
    token,
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  refreshToken,
};
