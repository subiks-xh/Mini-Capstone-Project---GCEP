const logger = require("../utils/logger");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../config/constants");

/**
 * Global error handling middleware
 * This should be the last middleware in the stack
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error("Error Handler:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = {
      message,
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = {
      message,
      statusCode: HTTP_STATUS.CONFLICT,
    };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = {
      message,
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = {
      message: RESPONSE_MESSAGES.ERROR.INVALID_TOKEN,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  if (err.name === "TokenExpiredError") {
    error = {
      message: RESPONSE_MESSAGES.ERROR.EXPIRED_TOKEN,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  // Custom application errors
  if (err.isOperational) {
    error = {
      message: err.message,
      statusCode: err.statusCode || HTTP_STATUS.BAD_REQUEST,
    };
  }

  res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message || RESPONSE_MESSAGES.ERROR.SERVER_ERROR,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Middleware to handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  next(error);
};

/**
 * Async wrapper to catch async route handler errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
};
