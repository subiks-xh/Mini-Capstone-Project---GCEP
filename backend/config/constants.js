// Application Constants

// User Roles
const USER_ROLES = {
  USER: "user",
  STAFF: "staff",
  ADMIN: "admin",
};

// Complaint Status
const COMPLAINT_STATUS = {
  SUBMITTED: "submitted",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in-progress",
  RESOLVED: "resolved",
  ESCALATED: "escalated",
  CLOSED: "closed",
};

// Complaint Priority
const COMPLAINT_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

// Feedback Rating
const FEEDBACK_RATING = {
  MIN: 1,
  MAX: 5,
};

// Default Resolution Times (in hours)
const DEFAULT_RESOLUTION_TIMES = {
  low: 72, // 3 days
  medium: 48, // 2 days
  high: 24, // 1 day
  urgent: 12, // 12 hours
};

// Departments
const DEPARTMENTS = [
  "IT Support",
  "Electrical",
  "Plumbing",
  "Maintenance",
  "Security",
  "Administration",
  "Finance",
  "Human Resources",
  "Customer Service",
  "General",
];

// Escalation Settings
const ESCALATION_CONFIG = {
  CHECK_INTERVAL_MINUTES: 60,
  BUFFER_HOURS: 1, // Grace period before escalation
};

// API Response Messages
const RESPONSE_MESSAGES = {
  SUCCESS: {
    USER_REGISTERED: "User registered successfully",
    USER_LOGIN: "User logged in successfully",
    USER_LOGOUT: "User logged out successfully",
    COMPLAINT_CREATED: "Complaint submitted successfully",
    COMPLAINT_UPDATED: "Complaint updated successfully",
    COMPLAINT_ASSIGNED: "Complaint assigned successfully",
    STATUS_UPDATED: "Status updated successfully",
    FEEDBACK_SUBMITTED: "Feedback submitted successfully",
  },
  ERROR: {
    USER_NOT_FOUND: "User not found",
    INVALID_CREDENTIALS: "Invalid credentials",
    USER_EXISTS: "User already exists",
    COMPLAINT_NOT_FOUND: "Complaint not found",
    UNAUTHORIZED: "Not authorized to access this resource",
    FORBIDDEN: "Access forbidden",
    VALIDATION_ERROR: "Validation error",
    SERVER_ERROR: "Internal server error",
    TOKEN_REQUIRED: "Access token required",
    INVALID_TOKEN: "Invalid token",
    EXPIRED_TOKEN: "Token expired",
  },
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports = {
  USER_ROLES,
  COMPLAINT_STATUS,
  COMPLAINT_PRIORITY,
  FEEDBACK_RATING,
  DEFAULT_RESOLUTION_TIMES,
  DEPARTMENTS,
  ESCALATION_CONFIG,
  RESPONSE_MESSAGES,
  HTTP_STATUS,
};
