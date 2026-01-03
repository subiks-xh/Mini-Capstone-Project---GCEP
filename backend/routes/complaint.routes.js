const express = require("express");
const rateLimit = require("express-rate-limit");

// Controllers
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  updateComplaintStatus,
  assignComplaint,
  getComplaintAnalytics,
} = require("../controllers/complaint.controller");

// Middleware
const { authenticate } = require("../middleware/auth.middleware");
const {
  authorize,
  requireStaffOrAdmin,
  requireAdmin,
} = require("../middleware/roleCheck.middleware");
const {
  validateComplaintCreation,
  validateComplaintUpdate,
  validateStatusUpdate,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation.middleware");

const router = express.Router();

// Rate limiting for complaint operations
const complaintLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for complaint operations
  message: {
    success: false,
    message: "Too many complaint requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for complaint creation
const createComplaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 complaint creations per hour
  message: {
    success: false,
    message: "Too many complaint creation attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication to all routes
router.use(authenticate);

/**
 * @desc    Get complaint analytics
 * @route   GET /api/complaints/analytics
 * @access  Private (Staff/Admin)
 */
router.get("/analytics", requireStaffOrAdmin, getComplaintAnalytics);

/**
 * @desc    Create new complaint
 * @route   POST /api/complaints
 * @access  Private (All authenticated users)
 */
router.post(
  "/",
  createComplaintLimiter,
  validateComplaintCreation,
  createComplaint
);

/**
 * @desc    Get all complaints (with filtering and pagination)
 * @route   GET /api/complaints
 * @access  Private (role-based access)
 */
router.get("/", validatePagination, getComplaints);

/**
 * @desc    Get single complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private (role-based access)
 */
router.get("/:id", validateObjectId("id"), getComplaintById);

/**
 * @desc    Update complaint
 * @route   PUT /api/complaints/:id
 * @access  Private (Owner or Staff/Admin)
 */
router.put(
  "/:id",
  complaintLimiter,
  validateObjectId("id"),
  validateComplaintUpdate,
  updateComplaint
);

/**
 * @desc    Delete complaint
 * @route   DELETE /api/complaints/:id
 * @access  Private (Owner or Admin only)
 */
router.delete("/:id", validateObjectId("id"), deleteComplaint);

/**
 * @desc    Update complaint status
 * @route   PATCH /api/complaints/:id/status
 * @access  Private (Staff/Admin only)
 */
router.patch(
  "/:id/status",
  complaintLimiter,
  validateObjectId("id"),
  validateStatusUpdate,
  requireStaffOrAdmin,
  updateComplaintStatus
);

/**
 * @desc    Assign complaint to staff
 * @route   PATCH /api/complaints/:id/assign
 * @access  Private (Admin only)
 */
router.patch(
  "/:id/assign",
  validateObjectId("id"),
  requireAdmin,
  assignComplaint
);

module.exports = router;
