const express = require("express");

// Controllers
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getUsers,
  updateUser,
  getDashboardStats,
} = require("../controllers/admin.controller");

// Services
const AnalyticsService = require("../services/analytics.service");
const EscalationService = require("../services/escalation.service");
const BackgroundJobsService = require("../services/backgroundJobs.service");

// Middleware
const { authenticate } = require("../middleware/auth.middleware");
const {
  requireAdmin,
  requireStaffOrAdmin,
} = require("../middleware/roleCheck.middleware");
const {
  validateCategoryCreation,
  validateObjectId,
} = require("../middleware/validation.middleware");

// Constants
const { HTTP_STATUS } = require("../config/constants");
const logger = require("../utils/logger");

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(authenticate);

/**
 * @desc    Get system dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
router.get("/dashboard", requireAdmin, getDashboardStats);

// Category Management Routes
/**
 * @desc    Create new category & Get all categories
 * @route   POST/GET /api/admin/categories
 * @access  Private (Admin only for POST, Staff/Admin for GET)
 */
router
  .route("/categories")
  .post(requireAdmin, validateCategoryCreation, createCategory)
  .get(requireStaffOrAdmin, getCategories);

/**
 * @desc    Get, Update & Delete category by ID
 * @route   GET/PUT/DELETE /api/admin/categories/:id
 * @access  Private (Staff/Admin for GET, Admin only for PUT/DELETE)
 */
router
  .route("/categories/:id")
  .get(validateObjectId("id"), requireStaffOrAdmin, getCategoryById)
  .put(validateObjectId("id"), requireAdmin, updateCategory)
  .delete(validateObjectId("id"), requireAdmin, deleteCategory);

// User Management Routes
/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
router.get("/users", requireAdmin, getUsers);

/**
 * @desc    Update user role/status
 * @route   PATCH /api/admin/users/:id
 * @access  Private (Admin only)
 */
router.patch("/users/:id", validateObjectId("id"), requireAdmin, updateUser);

// New Escalation Management Routes
/**
 * @desc    Get escalation preview (what would be escalated)
 * @route   GET /api/admin/escalations/preview
 * @access  Private (Admin only)
 */
router.get("/escalations/preview", requireAdmin, async (req, res) => {
  try {
    const preview = await EscalationService.previewEscalations();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: preview,
    });
  } catch (error) {
    logger.error("Error getting escalation preview:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error getting escalation preview",
    });
  }
});

/**
 * @desc    Get complaints at risk of escalation
 * @route   GET /api/admin/escalations/at-risk
 * @access  Private (Admin only)
 */
router.get("/escalations/at-risk", requireAdmin, async (req, res) => {
  try {
    const { hours = 2 } = req.query;
    const atRisk = await EscalationService.getAtRiskComplaints(parseInt(hours));
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: atRisk,
    });
  } catch (error) {
    logger.error("Error getting at-risk complaints:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error getting at-risk complaints",
    });
  }
});

/**
 * @desc    Get escalation statistics
 * @route   GET /api/admin/escalations/stats
 * @access  Private (Admin only)
 */
router.get("/escalations/stats", requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await EscalationService.getEscalationStats({
      startDate,
      endDate,
    });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error getting escalation stats:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error getting escalation statistics",
    });
  }
});

/**
 * @desc    Manually escalate a complaint
 * @route   POST /api/admin/escalations/manual
 * @access  Private (Admin only)
 */
router.post("/escalations/manual", requireAdmin, async (req, res) => {
  try {
    const { complaintId, reason } = req.body;
    const adminId = req.user._id;

    const result = await EscalationService.manualEscalation(
      complaintId,
      adminId,
      reason
    );
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Complaint escalated successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Error in manual escalation:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Error escalating complaint",
    });
  }
});

// Background Jobs Management Routes
/**
 * @desc    Get background jobs status
 * @route   GET /api/admin/jobs/status
 * @access  Private (Admin only)
 */
router.get("/jobs/status", requireAdmin, async (req, res) => {
  try {
    const status = BackgroundJobsService.getJobStatus();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("Error getting job status:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error getting job status",
    });
  }
});

/**
 * @desc    Run escalation check manually
 * @route   POST /api/admin/jobs/escalation/run
 * @access  Private (Admin only)
 */
router.post("/jobs/escalation/run", requireAdmin, async (req, res) => {
  try {
    const result = await BackgroundJobsService.runEscalationManually();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Manual escalation check completed",
      data: result,
    });
  } catch (error) {
    logger.error("Error in manual escalation run:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Error running escalation check",
    });
  }
});

// Analytics Routes
/**
 * @desc    Get comprehensive analytics report
 * @route   GET /api/admin/analytics/report
 * @access  Private (Admin only)
 */
router.get("/analytics/report", requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, trendDays = 30 } = req.query;
    const report = await AnalyticsService.generateDashboardReport({
      dateRange: { startDate, endDate },
      trendDays: parseInt(trendDays),
    });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error("Error generating dashboard report:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error generating comprehensive report",
    });
  }
});

/**
 * @desc    Get overview analytics
 * @route   GET /api/admin/analytics/overview
 * @access  Private (Admin only)
 */
router.get("/analytics/overview", requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await AnalyticsService.getOverviewAnalytics({
      startDate,
      endDate,
    });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Error getting overview analytics:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error getting overview analytics",
    });
  }
});

module.exports = router;
