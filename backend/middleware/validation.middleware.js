const { body, param, query, validationResult } = require('express-validator');
const { HTTP_STATUS, USER_ROLES, DEPARTMENTS, COMPLAINT_PRIORITY } = require('../config/constants');

/**
 * Handle validation result and return errors if any
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * User registration validation rules
 */
const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role'),
    
  body('department')
    .optional()
    .isIn(DEPARTMENTS)
    .withMessage('Invalid department')
    .custom((value, { req }) => {
      if (req.body.role === USER_ROLES.STAFF && !value) {
        throw new Error('Department is required for staff members');
      }
      return true;
    }),
    
  handleValidation
];

/**
 * User login validation rules
 */
const validateUserLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  handleValidation
];

/**
 * Complaint creation validation rules
 */
const validateComplaintCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
    
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
    
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
    
  body('priority')
    .optional()
    .isIn(Object.values(COMPLAINT_PRIORITY))
    .withMessage('Invalid priority level'),
    
  handleValidation
];

/**
 * Complaint update validation rules
 */
const validateComplaintUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
    
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
    
  body('priority')
    .optional()
    .isIn(Object.values(COMPLAINT_PRIORITY))
    .withMessage('Invalid priority level'),
    
  handleValidation
];

/**
 * Status update validation rules
 */
const validateStatusUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status is required'),
    
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),
    
  handleValidation
];

/**
 * Feedback validation rules
 */
const validateFeedback = [
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters'),
    
  handleValidation
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (field = 'id') => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field}`),
    
  handleValidation
];

/**
 * Category creation validation
 */
const validateCategoryCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
    
  body('department')
    .notEmpty()
    .withMessage('Department is required')
    .isIn(DEPARTMENTS)
    .withMessage('Invalid department'),
    
  body('resolutionTimeHours')
    .notEmpty()
    .withMessage('Resolution time is required')
    .isInt({ min: 1, max: 720 }) // Max 30 days
    .withMessage('Resolution time must be between 1 and 720 hours'),
    
  handleValidation
];

/**
 * Query parameter validation for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'priority', '-priority'])
    .withMessage('Invalid sort parameter'),
    
  handleValidation
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateComplaintCreation,
  validateComplaintUpdate,
  validateStatusUpdate,
  validateFeedback,
  validateObjectId,
  validateCategoryCreation,
  validatePagination,
  handleValidation
};