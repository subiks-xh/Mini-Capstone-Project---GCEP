const express = require("express");
const rateLimit = require("express-rate-limit");

// Controllers
const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  refreshToken,
} = require("../controllers/auth.controller");

// Middleware
const { authenticate } = require("../middleware/auth.middleware");
const {
  validateUserRegistration,
  validateUserLogin,
} = require("../middleware/validation.middleware");

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post("/register", authLimiter, validateUserRegistration, register);

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post("/login", loginLimiter, validateUserLogin, login);

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
router.post("/logout", authenticate, logout);

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
router.get("/me", authenticate, getMe);

/**
 * @desc    Update user password
 * @route   PUT /api/auth/password
 * @access  Private
 */
router.put("/password", authenticate, updatePassword);

/**
 * @desc    Refresh JWT token
 * @route   POST /api/auth/refresh
 * @access  Private
 */
router.post("/refresh", authenticate, refreshToken);

module.exports = router;
