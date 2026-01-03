const express = require("express");
const router = express.Router();
const StaffController = require("../controllers/staff.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  requireStaffOrAdmin,
  requireAdmin,
} = require("../middleware/roleCheck.middleware");
const { USER_ROLES } = require("../config/constants");
const {
  validateAssignComplaint,
  validateAutoAssign,
  validateStaffId,
  validateCategoryId,
  validateStaffQuery,
  validatePerformanceQuery,
} = require("../middleware/staffValidation");

/**
 * Staff Routes
 * All routes require authentication
 * Some routes require specific role authorization
 */

// Staff dashboard (accessible by staff and admin)
router.get(
  "/dashboard",
  authenticate,
  requireStaffOrAdmin,
  StaffController.getDashboard
);

// Get all staff members (admin only)
router.get(
  "/",
  authenticate,
  requireAdmin,
  validateStaffQuery,
  StaffController.getAllStaff
);

// Assign complaint to staff (admin only)
router.post(
  "/assign",
  authenticate,
  requireAdmin,
  validateAssignComplaint,
  StaffController.assignComplaint
);

// Auto-assign complaint (admin only)
router.post(
  "/auto-assign",
  authenticate,
  requireAdmin,
  validateAutoAssign,
  StaffController.autoAssignComplaint
);

// Get available staff for a category (admin and staff can view)
router.get(
  "/available/:categoryId",
  authenticate,
  requireStaffOrAdmin,
  validateCategoryId,
  StaffController.getAvailableStaff
);

// Get staff performance metrics (admin can view any, staff can view own)
router.get(
  "/performance/:staffId",
  authenticate,
  requireStaffOrAdmin,
  validateStaffId,
  validatePerformanceQuery,
  StaffController.getStaffPerformance
);

module.exports = router;
