const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Category = require("../models/Category");
const Feedback = require("../models/Feedback");
const logger = require("../utils/logger");
const {
  COMPLAINT_STATUS,
  COMPLAINT_PRIORITY,
  USER_ROLES,
} = require("../config/constants");

/**
 * Analytics Service
 * Provides comprehensive analytics and insights for the complaint system
 */
class AnalyticsService {
  /**
   * Get overview dashboard analytics
   * @param {Object} dateRange - Optional date range filter
   */
  static async getOverviewAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let matchStage = {};

      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Total complaints by status
      const statusStats = await Complaint.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      // Total complaints by priority
      const priorityStats = await Complaint.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]);

      // Resolution time averages
      const resolutionStats = await Complaint.aggregate([
        {
          $match: {
            ...matchStage,
            status: COMPLAINT_STATUS.RESOLVED,
            resolvedAt: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgResolutionTime: {
              $avg: {
                $divide: [
                  { $subtract: ["$resolvedAt", "$createdAt"] },
                  1000 * 60 * 60, // Convert to hours
                ],
              },
            },
            totalResolved: { $sum: 1 },
          },
        },
      ]);

      // Get current active complaints
      const activeComplaints = await Complaint.countDocuments({
        status: {
          $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED],
        },
      });

      // Get overdue complaints count
      const overdueComplaints = await Complaint.countDocuments({
        deadline: { $lt: new Date() },
        status: {
          $nin: [
            COMPLAINT_STATUS.RESOLVED,
            COMPLAINT_STATUS.CLOSED,
            COMPLAINT_STATUS.ESCALATED,
          ],
        },
      });

      // Get escalated complaints count
      const escalatedComplaints = await Complaint.countDocuments({
        "escalation.isEscalated": true,
        ...matchStage,
      });

      // Convert arrays to objects for easier consumption
      const statusBreakdown = statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      const priorityBreakdown = priorityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      return {
        overview: {
          totalComplaints: statusStats.reduce(
            (sum, stat) => sum + stat.count,
            0
          ),
          activeComplaints,
          resolvedComplaints: statusBreakdown[COMPLAINT_STATUS.RESOLVED] || 0,
          overdueComplaints,
          escalatedComplaints,
          avgResolutionTimeHours:
            resolutionStats[0]?.avgResolutionTime?.toFixed(2) || 0,
        },
        breakdown: {
          status: statusBreakdown,
          priority: priorityBreakdown,
        },
        performance: {
          resolutionRate:
            statusStats.reduce((sum, stat) => sum + stat.count, 0) > 0
              ? (
                  ((statusBreakdown[COMPLAINT_STATUS.RESOLVED] || 0) /
                    statusStats.reduce((sum, stat) => sum + stat.count, 0)) *
                  100
                ).toFixed(2)
              : 0,
          escalationRate:
            statusStats.reduce((sum, stat) => sum + stat.count, 0) > 0
              ? (
                  (escalatedComplaints /
                    statusStats.reduce((sum, stat) => sum + stat.count, 0)) *
                  100
                ).toFixed(2)
              : 0,
        },
      };
    } catch (error) {
      logger.error("Error getting overview analytics:", error);
      throw error;
    }
  }

  /**
   * Get trend analytics (complaints over time)
   * @param {Object} options - Time period and granularity options
   */
  static async getTrendAnalytics(options = {}) {
    try {
      const {
        days = 30,
        granularity = "day", // 'day', 'week', 'month'
      } = options;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let groupFormat;
      switch (granularity) {
        case "hour":
          groupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" },
          };
          break;
        case "week":
          groupFormat = {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
          };
          break;
        case "month":
          groupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          };
          break;
        default: // day
          groupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          };
      }

      const trendData = await Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: groupFormat,
            submitted: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
              },
            },
            escalated: {
              $sum: {
                $cond: [{ $eq: ["$escalation.isEscalated", true] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
            "_id.day": 1,
            "_id.hour": 1,
            "_id.week": 1,
          },
        },
      ]);

      // Format the data for frontend consumption
      const formattedTrend = trendData.map((item) => ({
        period: this.formatPeriodLabel(item._id, granularity),
        submitted: item.submitted,
        resolved: item.resolved,
        escalated: item.escalated,
        raw: item._id,
      }));

      return {
        period: `Last ${days} days`,
        granularity,
        data: formattedTrend,
        summary: {
          totalPeriods: formattedTrend.length,
          totalSubmitted: formattedTrend.reduce(
            (sum, item) => sum + item.submitted,
            0
          ),
          totalResolved: formattedTrend.reduce(
            (sum, item) => sum + item.resolved,
            0
          ),
          totalEscalated: formattedTrend.reduce(
            (sum, item) => sum + item.escalated,
            0
          ),
        },
      };
    } catch (error) {
      logger.error("Error getting trend analytics:", error);
      throw error;
    }
  }

  /**
   * Get category-wise analytics
   */
  static async getCategoryAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let matchStage = {};

      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const categoryStats = await Complaint.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryData",
          },
        },
        { $unwind: "$categoryData" },
        {
          $group: {
            _id: "$categoryData._id",
            categoryName: { $first: "$categoryData.name" },
            department: { $first: "$categoryData.department" },
            totalComplaints: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
              },
            },
            escalated: {
              $sum: {
                $cond: [{ $eq: ["$escalation.isEscalated", true] }, 1, 0],
              },
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $ne: ["$resolvedAt", null] },
                  {
                    $divide: [
                      { $subtract: ["$resolvedAt", "$createdAt"] },
                      1000 * 60 * 60,
                    ],
                  },
                  null,
                ],
              },
            },
            priorityBreakdown: {
              $push: "$priority",
            },
          },
        },
        {
          $addFields: {
            resolutionRate: {
              $cond: [
                { $gt: ["$totalComplaints", 0] },
                {
                  $multiply: [
                    { $divide: ["$resolved", "$totalComplaints"] },
                    100,
                  ],
                },
                0,
              ],
            },
            escalationRate: {
              $cond: [
                { $gt: ["$totalComplaints", 0] },
                {
                  $multiply: [
                    { $divide: ["$escalated", "$totalComplaints"] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { totalComplaints: -1 } },
      ]);

      // Process priority breakdown for each category
      const processedCategoryStats = categoryStats.map((cat) => {
        const priorityCount = {};
        cat.priorityBreakdown.forEach((priority) => {
          priorityCount[priority] = (priorityCount[priority] || 0) + 1;
        });

        return {
          ...cat,
          priorityBreakdown: priorityCount,
          avgResolutionTime: cat.avgResolutionTime
            ? cat.avgResolutionTime.toFixed(2)
            : 0,
          resolutionRate: cat.resolutionRate.toFixed(2),
          escalationRate: cat.escalationRate.toFixed(2),
        };
      });

      return {
        categories: processedCategoryStats,
        summary: {
          totalCategories: processedCategoryStats.length,
          mostActiveCategory: processedCategoryStats[0]?.categoryName || "N/A",
          avgResolutionRate:
            processedCategoryStats.length > 0
              ? (
                  processedCategoryStats.reduce(
                    (sum, cat) => sum + parseFloat(cat.resolutionRate),
                    0
                  ) / processedCategoryStats.length
                ).toFixed(2)
              : 0,
        },
      };
    } catch (error) {
      logger.error("Error getting category analytics:", error);
      throw error;
    }
  }

  /**
   * Get staff performance analytics
   */
  static async getStaffAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let matchStage = {};

      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const staffStats = await Complaint.aggregate([
        {
          $match: {
            ...matchStage,
            assignedTo: { $ne: null },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignedTo",
            foreignField: "_id",
            as: "staffData",
          },
        },
        { $unwind: "$staffData" },
        {
          $group: {
            _id: "$assignedTo",
            staffName: { $first: "$staffData.name" },
            staffEmail: { $first: "$staffData.email" },
            department: { $first: "$staffData.department" },
            role: { $first: "$staffData.role" },
            totalAssigned: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
              },
            },
            escalated: {
              $sum: {
                $cond: [{ $eq: ["$escalation.isEscalated", true] }, 1, 0],
              },
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $ne: ["$resolvedAt", null] },
                  {
                    $divide: [
                      { $subtract: ["$resolvedAt", "$createdAt"] },
                      1000 * 60 * 60,
                    ],
                  },
                  null,
                ],
              },
            },
          },
        },
        {
          $addFields: {
            resolutionRate: {
              $cond: [
                { $gt: ["$totalAssigned", 0] },
                {
                  $multiply: [
                    { $divide: ["$resolved", "$totalAssigned"] },
                    100,
                  ],
                },
                0,
              ],
            },
            escalationRate: {
              $cond: [
                { $gt: ["$totalAssigned", 0] },
                {
                  $multiply: [
                    { $divide: ["$escalated", "$totalAssigned"] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { totalAssigned: -1 } },
      ]);

      const processedStaffStats = staffStats.map((staff) => ({
        ...staff,
        avgResolutionTime: staff.avgResolutionTime
          ? staff.avgResolutionTime.toFixed(2)
          : 0,
        resolutionRate: staff.resolutionRate.toFixed(2),
        escalationRate: staff.escalationRate.toFixed(2),
      }));

      return {
        staff: processedStaffStats,
        summary: {
          totalActiveStaff: processedStaffStats.length,
          avgResolutionRate:
            processedStaffStats.length > 0
              ? (
                  processedStaffStats.reduce(
                    (sum, staff) => sum + parseFloat(staff.resolutionRate),
                    0
                  ) / processedStaffStats.length
                ).toFixed(2)
              : 0,
          topPerformer:
            processedStaffStats.length > 0
              ? processedStaffStats.reduce((top, staff) =>
                  parseFloat(staff.resolutionRate) >
                  parseFloat(top.resolutionRate)
                    ? staff
                    : top
                )
              : null,
        },
      };
    } catch (error) {
      logger.error("Error getting staff analytics:", error);
      throw error;
    }
  }

  /**
   * Get feedback analytics
   */
  static async getFeedbackAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let matchStage = {};

      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const feedbackStats = await Feedback.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalFeedbacks: { $sum: 1 },
            avgOverallRating: { $avg: "$overallRating" },
            avgResponseTimeRating: { $avg: "$responseTimeRating" },
            avgResolutionQualityRating: { $avg: "$resolutionQualityRating" },
            avgCommunicationRating: { $avg: "$communicationRating" },
            ratings: { $push: "$overallRating" },
          },
        },
      ]);

      // Get rating distribution
      const ratingDistribution = await Feedback.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$overallRating",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const stats = feedbackStats[0] || {
        totalFeedbacks: 0,
        avgOverallRating: 0,
        avgResponseTimeRating: 0,
        avgResolutionQualityRating: 0,
        avgCommunicationRating: 0,
      };

      return {
        summary: {
          totalFeedbacks: stats.totalFeedbacks,
          avgOverallRating: stats.avgOverallRating
            ? stats.avgOverallRating.toFixed(2)
            : 0,
          avgResponseTimeRating: stats.avgResponseTimeRating
            ? stats.avgResponseTimeRating.toFixed(2)
            : 0,
          avgResolutionQualityRating: stats.avgResolutionQualityRating
            ? stats.avgResolutionQualityRating.toFixed(2)
            : 0,
          avgCommunicationRating: stats.avgCommunicationRating
            ? stats.avgCommunicationRating.toFixed(2)
            : 0,
        },
        ratingDistribution: ratingDistribution.reduce((acc, item) => {
          acc[`${item._id}star`] = item.count;
          return acc;
        }, {}),
        satisfactionLevel: this.calculateSatisfactionLevel(
          stats.avgOverallRating || 0
        ),
      };
    } catch (error) {
      logger.error("Error getting feedback analytics:", error);
      throw error;
    }
  }

  /**
   * Get SLA (Service Level Agreement) performance
   */
  static async getSLAPerformance(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let matchStage = {};

      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const slaStats = await Complaint.aggregate([
        { $match: matchStage },
        {
          $addFields: {
            isOverdue: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$deadline", new Date()] },
                    { $nin: ["$status", ["resolved", "closed"]] },
                  ],
                },
                true,
                false,
              ],
            },
            resolvedOnTime: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "resolved"] },
                    { $lt: ["$resolvedAt", "$deadline"] },
                  ],
                },
                true,
                false,
              ],
            },
          },
        },
        {
          $group: {
            _id: "$priority",
            totalComplaints: { $sum: 1 },
            overdueCount: {
              $sum: { $cond: ["$isOverdue", 1, 0] },
            },
            resolvedOnTimeCount: {
              $sum: { $cond: ["$resolvedOnTime", 1, 0] },
            },
            avgTimeToResolution: {
              $avg: {
                $cond: [
                  { $ne: ["$resolvedAt", null] },
                  {
                    $divide: [
                      { $subtract: ["$resolvedAt", "$createdAt"] },
                      1000 * 60 * 60,
                    ],
                  },
                  null,
                ],
              },
            },
          },
        },
        {
          $addFields: {
            slaCompliance: {
              $cond: [
                { $gt: ["$totalComplaints", 0] },
                {
                  $multiply: [
                    { $divide: ["$resolvedOnTimeCount", "$totalComplaints"] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      ]);

      const processedSLAStats = slaStats.map((stat) => ({
        priority: stat._id,
        totalComplaints: stat.totalComplaints,
        overdueCount: stat.overdueCount,
        resolvedOnTimeCount: stat.resolvedOnTimeCount,
        slaCompliance: stat.slaCompliance.toFixed(2),
        avgTimeToResolution: stat.avgTimeToResolution
          ? stat.avgTimeToResolution.toFixed(2)
          : 0,
      }));

      // Calculate overall SLA compliance
      const overallCompliance =
        slaStats.length > 0
          ? (
              slaStats.reduce((sum, stat) => sum + stat.slaCompliance, 0) /
              slaStats.length
            ).toFixed(2)
          : 0;

      return {
        byPriority: processedSLAStats,
        overall: {
          compliance: overallCompliance,
          totalComplaints: slaStats.reduce(
            (sum, stat) => sum + stat.totalComplaints,
            0
          ),
          totalOverdue: slaStats.reduce(
            (sum, stat) => sum + stat.overdueCount,
            0
          ),
          totalResolvedOnTime: slaStats.reduce(
            (sum, stat) => sum + stat.resolvedOnTimeCount,
            0
          ),
        },
      };
    } catch (error) {
      logger.error("Error getting SLA performance:", error);
      throw error;
    }
  }

  /**
   * Helper method to format period labels
   */
  static formatPeriodLabel(dateObj, granularity) {
    switch (granularity) {
      case "hour":
        return `${dateObj.year}-${String(dateObj.month).padStart(
          2,
          "0"
        )}-${String(dateObj.day).padStart(2, "0")} ${String(
          dateObj.hour
        ).padStart(2, "0")}:00`;
      case "week":
        return `${dateObj.year}-W${String(dateObj.week).padStart(2, "0")}`;
      case "month":
        return `${dateObj.year}-${String(dateObj.month).padStart(2, "0")}`;
      default: // day
        return `${dateObj.year}-${String(dateObj.month).padStart(
          2,
          "0"
        )}-${String(dateObj.day).padStart(2, "0")}`;
    }
  }

  /**
   * Helper method to calculate satisfaction level
   */
  static calculateSatisfactionLevel(avgRating) {
    if (avgRating >= 4.5) return "Excellent";
    if (avgRating >= 4.0) return "Very Good";
    if (avgRating >= 3.5) return "Good";
    if (avgRating >= 3.0) return "Fair";
    if (avgRating >= 2.0) return "Poor";
    return "Very Poor";
  }

  /**
   * Generate comprehensive dashboard report
   */
  static async generateDashboardReport(options = {}) {
    try {
      const dateRange = options.dateRange || {};

      const [overview, trends, categories, staff, feedback, sla] =
        await Promise.all([
          this.getOverviewAnalytics(dateRange),
          this.getTrendAnalytics({ days: options.trendDays || 30 }),
          this.getCategoryAnalytics(dateRange),
          this.getStaffAnalytics(dateRange),
          this.getFeedbackAnalytics(dateRange),
          this.getSLAPerformance(dateRange),
        ]);

      return {
        reportGenerated: new Date(),
        dateRange: dateRange,
        overview,
        trends,
        categories,
        staff,
        feedback,
        sla,
      };
    } catch (error) {
      logger.error("Error generating dashboard report:", error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
