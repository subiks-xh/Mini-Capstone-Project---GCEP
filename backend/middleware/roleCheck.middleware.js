const { USER_ROLES, HTTP_STATUS, RESPONSE_MESSAGES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has required role(s)
 * @param {string|array} roles - Single role string or array of allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.UNAUTHORIZED
        });
      }

      // Check if user's role is in the allowed roles
      if (!roles.includes(req.user.role)) {
        logger.warn(`Access denied for user ${req.user.email} with role ${req.user.role}. Required roles: ${roles.join(', ')}`);
        
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.FORBIDDEN
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
      });
    }
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = authorize(USER_ROLES.ADMIN);

/**
 * Middleware to check if user is staff or admin
 */
const requireStaffOrAdmin = authorize(USER_ROLES.STAFF, USER_ROLES.ADMIN);

/**
 * Middleware to check if user can access their own resources or is admin
 * Expects req.params.userId or req.params.id to match req.user.id
 */
const requireOwnershipOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.UNAUTHORIZED
      });
    }

    const resourceUserId = req.params.userId || req.params.id;
    const currentUserId = req.user.id.toString();
    
    // Allow if user is admin or accessing their own resource
    if (req.user.role === USER_ROLES.ADMIN || resourceUserId === currentUserId) {
      return next();
    }

    logger.warn(`Ownership access denied for user ${req.user.email} trying to access resource for user ${resourceUserId}`);
    
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });

  } catch (error) {
    logger.error('Ownership authorization error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
    });
  }
};

/**
 * Middleware to check if staff user can access complaints from their department
 * or if user is admin (can access all)
 */
const requireDepartmentAccessOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.UNAUTHORIZED
      });
    }

    // Admin can access everything
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    // Staff can only access their department's complaints
    if (req.user.role === USER_ROLES.STAFF) {
      // This will be used in complaint-related routes
      // The actual department check will be done in the controller
      return next();
    }

    // Regular users have different access patterns handled in controllers
    if (req.user.role === USER_ROLES.USER) {
      return next();
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: RESPONSE_MESSAGES.ERROR.FORBIDDEN
    });

  } catch (error) {
    logger.error('Department authorization error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
    });
  }
};

module.exports = {
  authorize,
  requireAdmin,
  requireStaffOrAdmin,
  requireOwnershipOrAdmin,
  requireDepartmentAccessOrAdmin
};