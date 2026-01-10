const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../config/constants");

/**
 * Middleware to authenticate JWT token from cookies or Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in cookies first (preferred for web)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check for token in Authorization header (for mobile/API clients)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.substring(7);
    }

    // If no token found
    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.TOKEN_REQUIRED,
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select("+password");

      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND,
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "Account has been deactivated",
        });
      }

      // Add user to request object (excluding password)
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      };

      next();
    } catch (jwtError) {
      logger.error("JWT verification failed:", jwtError.message);

      if (jwtError.name === "TokenExpiredError") {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.EXPIRED_TOKEN,
        });
      }

      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.INVALID_TOKEN,
      });
    }
  } catch (error) {
    logger.error("Authentication middleware error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR,
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Used for endpoints that work differently for authenticated/unauthenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user && user.isActive) {
        req.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        };
      } else {
        req.user = null;
      }
    } catch (jwtError) {
      req.user = null;
    }

    next();
  } catch (error) {
    logger.error("Optional authentication error:", error);
    req.user = null;
    next();
  }
};

const { authorize } = require("./roleCheck.middleware");

module.exports = {
  authenticate,
  protect: authenticate, // Alias for authenticate
  optionalAuth,
  authorize, // Re-export from roleCheck middleware
};
