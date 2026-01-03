const express = require('express');

// Controllers
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getUsers,
  updateUser,
  getDashboardStats
} = require('../controllers/admin.controller');

// Middleware
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requireStaffOrAdmin } = require('../middleware/roleCheck.middleware');
const {
  validateCategoryCreation,
  validateObjectId
} = require('../middleware/validation.middleware');

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(authenticate);

/**
 * @desc    Get system dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
router.get('/dashboard', requireAdmin, getDashboardStats);

// Category Management Routes
/**
 * @desc    Create new category & Get all categories
 * @route   POST/GET /api/admin/categories
 * @access  Private (Admin only for POST, Staff/Admin for GET)
 */
router.route('/categories')
  .post(requireAdmin, validateCategoryCreation, createCategory)
  .get(requireStaffOrAdmin, getCategories);

/**
 * @desc    Get, Update & Delete category by ID
 * @route   GET/PUT/DELETE /api/admin/categories/:id
 * @access  Private (Staff/Admin for GET, Admin only for PUT/DELETE)
 */
router.route('/categories/:id')
  .get(validateObjectId('id'), requireStaffOrAdmin, getCategoryById)
  .put(validateObjectId('id'), requireAdmin, updateCategory)
  .delete(validateObjectId('id'), requireAdmin, deleteCategory);

// User Management Routes
/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
router.get('/users', requireAdmin, getUsers);

/**
 * @desc    Update user role/status
 * @route   PATCH /api/admin/users/:id
 * @access  Private (Admin only)
 */
router.patch('/users/:id', validateObjectId('id'), requireAdmin, updateUser);

module.exports = router;