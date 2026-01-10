const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const AnalyticsService = require("../services/analytics.service");
const { AppError } = require("../middleware/error.middleware");

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Staff)
router.get(
  "/dashboard",
  protect,
  authorize(["admin", "staff"]),
  async (req, res, next) => {
    try {
      const { timeframe = "30d" } = req.query;
      const userId = req.user._id;
      const userRole = req.user.role;

      const analytics = await AnalyticsService.getDashboardStats(
        userId,
        userRole,
        timeframe
      );

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get staff performance metrics
// @route   GET /api/analytics/staff-performance
// @access  Private (Admin)
router.get(
  "/staff-performance",
  protect,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const { timeframe = "30d" } = req.query;

      const metrics = await AnalyticsService.getStaffPerformanceMetrics(
        timeframe
      );

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get complaint volume trends
// @route   GET /api/analytics/volume-trends
// @access  Private (Admin, Staff)
router.get(
  "/volume-trends",
  protect,
  authorize(["admin", "staff"]),
  async (req, res, next) => {
    try {
      const { timeframe = "30d" } = req.query;

      const trends = await AnalyticsService.getComplaintVolumeTrends(timeframe);

      res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get real-time metrics
// @route   GET /api/analytics/realtime
// @access  Private (Admin, Staff)
router.get(
  "/realtime",
  protect,
  authorize(["admin", "staff"]),
  async (req, res, next) => {
    try {
      const metrics = await AnalyticsService.getRealtimeMetrics();

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get category analytics
// @route   GET /api/analytics/categories
// @access  Private (Admin, Staff)
router.get(
  "/categories",
  protect,
  authorize(["admin", "staff"]),
  async (req, res, next) => {
    try {
      const { timeframe = "30d" } = req.query;
      const days = parseInt(timeframe.replace("d", "")) || 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const analytics = await AnalyticsService.getCategoryAnalytics({
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get resolution time analytics
// @route   GET /api/analytics/resolution-times
// @access  Private (Admin, Staff)
router.get(
  "/resolution-times",
  protect,
  authorize(["admin", "staff"]),
  async (req, res, next) => {
    try {
      const { timeframe = "30d" } = req.query;
      const days = parseInt(timeframe.replace("d", "")) || 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const analytics = await AnalyticsService.getOverviewAnalytics({
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: {
          avgResolutionTime: analytics.avgResolutionTime,
          resolutionTimesByPriority: analytics.resolutionTimesByPriority || [],
          resolutionTrends: analytics.resolutionTrends || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get user satisfaction analytics
// @route   GET /api/analytics/satisfaction
// @access  Private (Admin)
router.get(
  "/satisfaction",
  protect,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const { timeframe = "30d" } = req.query;
      const days = parseInt(timeframe.replace("d", "")) || 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const analytics = await AnalyticsService.getFeedbackAnalytics({
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Export analytics data
// @route   GET /api/analytics/export
// @access  Private (Admin)
router.get("/export", protect, authorize(["admin"]), async (req, res, next) => {
  try {
    const {
      format = "json",
      timeframe = "30d",
      includeCategories = true,
      includeStaff = true,
      includeResolutionTimes = true,
    } = req.query;

    const exportData = await AnalyticsService.exportAnalyticsData({
      format,
      timeframe,
      options: {
        includeCategories: includeCategories === "true",
        includeStaff: includeStaff === "true",
        includeResolutionTimes: includeResolutionTimes === "true",
      },
    });

    // Set appropriate headers for download
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `analytics-${timestamp}.${format}`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      format === "csv" ? "text/csv" : "application/json"
    );

    res.status(200).send(exportData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
