const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Staff Validation Middleware
 * Contains validation rules for all staff-related operations
 */

// Validate complaint assignment
const validateAssignComplaint = [
  body('complaintId')
    .notEmpty()
    .withMessage('Complaint ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid complaint ID format');
      }
      return true;
    }),
  
  body('staffId')
    .notEmpty()
    .withMessage('Staff ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid staff ID format');
      }
      return true;
    }),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validate auto assignment
const validateAutoAssign = [
  body('complaintId')
    .notEmpty()
    .withMessage('Complaint ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid complaint ID format');
      }
      return true;
    })
];

// Validate staff ID parameter
const validateStaffId = [
  param('staffId')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid staff ID format');
      }
      return true;
    })
];

// Validate category ID parameter
const validateCategoryId = [
  param('categoryId')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    })
];

// Validate staff query parameters
const validateStaffQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('department')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validate performance query parameters
const validatePerformanceQuery = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

module.exports = {
  validateAssignComplaint,
  validateAutoAssign,
  validateStaffId,
  validateCategoryId,
  validateStaffQuery,
  validatePerformanceQuery
};