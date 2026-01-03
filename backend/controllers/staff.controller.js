const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Category = require('../models/Category');
const { validationResult } = require('express-validator');
const { 
  RESPONSE_MESSAGES, 
  HTTP_STATUS, 
  USER_ROLES, 
  COMPLAINT_STATUS 
} = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Staff Controller
 * Handles staff-specific operations and complaint assignments
 */
class StaffController {

  /**
   * Get staff dashboard data
   * GET /api/staff/dashboard
   */
  static async getDashboard(req, res) {
    try {
      const staffId = req.user._id;

      // Get staff's assigned complaints statistics
      const assignedStats = await Complaint.aggregate([
        { $match: { assignedTo: staffId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get recent assigned complaints
      const recentComplaints = await Complaint.find({ 
        assignedTo: staffId 
      })
        .populate('user', 'name email')
        .populate('category', 'name department')
        .sort({ updatedAt: -1 })
        .limit(10);

      // Get overdue complaints assigned to this staff
      const overdueComplaints = await Complaint.find({
        assignedTo: staffId,
        deadline: { $lt: new Date() },
        status: { 
          $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] 
        }
      })
        .populate('user', 'name email')
        .populate('category', 'name department')
        .sort({ deadline: 1 });

      // Get workload by priority
      const workloadByPriority = await Complaint.aggregate([
        { 
          $match: { 
            assignedTo: staffId,
            status: { 
              $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] 
            }
          } 
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get performance metrics (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const performanceMetrics = await Complaint.aggregate([
        {
          $match: {
            assignedTo: staffId,
            resolvedAt: { $gte: thirtyDaysAgo },
            status: COMPLAINT_STATUS.RESOLVED
          }
        },
        {
          $group: {
            _id: null,
            totalResolved: { $sum: 1 },
            avgResolutionTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            }
          }
        }
      ]);

      const dashboard = {
        assignedStats: assignedStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        totalAssigned: recentComplaints.length || 0,
        overdue: overdueComplaints.length || 0,
        recentComplaints,
        overdueComplaints: overdueComplaints.slice(0, 5), // Top 5 most overdue
        workloadByPriority: workloadByPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        performanceMetrics: performanceMetrics[0] || {
          totalResolved: 0,
          avgResolutionTime: 0
        },
        summary: {
          activeComplaints: assignedStats
            .filter(s => !['resolved', 'closed'].includes(s._id))
            .reduce((sum, s) => sum + s.count, 0),
          completedThisMonth: performanceMetrics[0]?.totalResolved || 0,
          avgResolutionHours: performanceMetrics[0]?.avgResolutionTime?.toFixed(1) || '0.0'
        }
      };

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      logger.error('Error fetching staff dashboard:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all staff members (admin only)
   * GET /api/staff
   */
  static async getAllStaff(req, res) {
    try {
      const { page = 1, limit = 20, department, isActive = true } = req.query;

      const filter = { 
        role: { $in: [USER_ROLES.STAFF, USER_ROLES.ADMIN] }
      };

      if (department) {
        filter.department = department;
      }

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      const staff = await User.find(filter)
        .select('-password')
        .sort({ name: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const totalStaff = await User.countDocuments(filter);

      // Get workload for each staff member
      const staffWithWorkload = await Promise.all(
        staff.map(async (staffMember) => {
          const workload = await Complaint.aggregate([
            { 
              $match: { 
                assignedTo: staffMember._id,
                status: { 
                  $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] 
                }
              } 
            },
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 }
              }
            }
          ]);

          const totalActive = workload.reduce((sum, w) => sum + w.count, 0);

          return {
            ...staffMember.toObject(),
            workload: {
              total: totalActive,
              byPriority: workload.reduce((acc, w) => {
                acc[w._id] = w.count;
                return acc;
              }, {})
            }
          };
        })
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          staff: staffWithWorkload,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(totalStaff / limit),
            total: totalStaff
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching staff members:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
      });
    }
  }

  /**
   * Assign complaint to staff member
   * POST /api/staff/assign
   */
  static async assignComplaint(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.VALIDATION_ERROR,
          errors: errors.array()
        });
      }

      const { complaintId, staffId, priority, notes } = req.body;
      const assignedBy = req.user._id;

      // Find the complaint
      const complaint = await Complaint.findById(complaintId)
        .populate('user', 'name email')
        .populate('category', 'name department');

      if (!complaint) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND
        });
      }

      // Check if complaint can be assigned
      if ([COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED].includes(complaint.status)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Cannot assign resolved or closed complaint'
        });
      }

      // Find the staff member
      const staff = await User.findOne({ 
        _id: staffId, 
        role: { $in: [USER_ROLES.STAFF, USER_ROLES.ADMIN] }, 
        isActive: true 
      });

      if (!staff) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Staff member not found or inactive'
        });
      }

      // Update priority if provided
      if (priority && priority !== complaint.priority) {
        complaint.priority = priority;
      }

      // Assign the complaint
      await complaint.assignTo(staffId, assignedBy);

      // Add internal note if provided
      if (notes) {
        complaint.internalNotes.push({
          note: `Assignment notes: ${notes}`,
          addedBy: assignedBy,
          addedAt: new Date()
        });
        await complaint.save();
      }

      // Log the assignment
      logger.info(`Complaint ${complaintId} assigned to ${staff.email} by ${req.user.email}`);

      // Populate the updated complaint for response
      await complaint.populate([
        { path: 'user', select: 'name email' },
        { path: 'category', select: 'name department' },
        { path: 'assignedTo', select: 'name email department' }
      ]);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: RESPONSE_MESSAGES.SUCCESS.COMPLAINT_ASSIGNED,
        data: complaint
      });

    } catch (error) {
      logger.error('Error assigning complaint:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
      });
    }
  }

  /**
   * Get available staff for assignment based on workload and department
   * GET /api/staff/available/:categoryId
   */
  static async getAvailableStaff(req, res) {
    try {
      const { categoryId } = req.params;
      const { priorityLevel = 'medium' } = req.query;

      // Get category to determine department
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Find staff members in the relevant department
      const departmentFilter = {
        role: { $in: [USER_ROLES.STAFF, USER_ROLES.ADMIN] },
        isActive: true,
        $or: [
          { department: category.department },
          { department: 'General' }, // General staff can handle any department
          { role: USER_ROLES.ADMIN } // Admins can handle any complaint
        ]
      };

      const availableStaff = await User.find(departmentFilter)
        .select('name email department role');

      // Calculate workload and availability score for each staff member
      const staffWithAvailability = await Promise.all(
        availableStaff.map(async (staff) => {
          // Get current workload
          const currentWorkload = await Complaint.countDocuments({
            assignedTo: staff._id,
            status: { 
              $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] 
            }
          });

          // Get high/urgent priority workload
          const highPriorityWorkload = await Complaint.countDocuments({
            assignedTo: staff._id,
            priority: { $in: ['high', 'urgent'] },
            status: { 
              $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] 
            }
          });

          // Calculate availability score (lower is better)
          const baseScore = currentWorkload;
          const priorityPenalty = highPriorityWorkload * 2; // High priority complaints count double
          const rolePriority = staff.department === category.department ? 0 : 1; // Same department preferred
          
          const availabilityScore = baseScore + priorityPenalty + rolePriority;

          return {
            ...staff.toObject(),
            workload: {
              total: currentWorkload,
              highPriority: highPriorityWorkload,
              availabilityScore
            },
            recommended: availabilityScore <= 5 // Recommend if score is 5 or less
          };
        })
      );

      // Sort by availability score (best matches first)
      staffWithAvailability.sort((a, b) => a.workload.availabilityScore - b.workload.availabilityScore);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          category: {
            name: category.name,
            department: category.department
          },
          availableStaff: staffWithAvailability,
          recommended: staffWithAvailability.filter(s => s.recommended),
          summary: {
            totalStaff: staffWithAvailability.length,
            recommendedStaff: staffWithAvailability.filter(s => s.recommended).length,
            avgWorkload: staffWithAvailability.reduce((sum, s) => sum + s.workload.total, 0) / staffWithAvailability.length
          }
        }
      });

    } catch (error) {
      logger.error('Error getting available staff:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
      });
    }
  }

  /**
   * Auto-assign complaint based on workload and availability
   * POST /api/staff/auto-assign
   */
  static async autoAssignComplaint(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.VALIDATION_ERROR,
          errors: errors.array()
        });
      }

      const { complaintId } = req.body;
      const assignedBy = req.user._id;

      // Find the complaint
      const complaint = await Complaint.findById(complaintId)
        .populate('user', 'name email')
        .populate('category', 'name department resolutionTimeHours');

      if (!complaint) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND
        });
      }

      // Check if already assigned
      if (complaint.assignedTo) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Complaint is already assigned'
        });
      }

      // Find the best available staff member
      const departmentFilter = {
        role: { $in: [USER_ROLES.STAFF, USER_ROLES.ADMIN] },
        isActive: true,
        $or: [
          { department: complaint.category.department },
          { department: 'General' },
          { role: USER_ROLES.ADMIN }
        ]
      };

      const availableStaff = await User.find(departmentFilter);

      if (availableStaff.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'No available staff members found for this department'
        });
      }

      // Calculate best staff member
      let bestStaff = null;
      let bestScore = Infinity;

      for (const staff of availableStaff) {
        const currentWorkload = await Complaint.countDocuments({
          assignedTo: staff._id,
          status: { 
            $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] 
          }
        });

        const highPriorityWorkload = await Complaint.countDocuments({
          assignedTo: staff._id,
          priority: { $in: ['high', 'urgent'] },
          status: { 
            $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] 
          }
        });

        // Calculate score
        const baseScore = currentWorkload;
        const priorityPenalty = highPriorityWorkload * 2;
        const departmentBonus = staff.department === complaint.category.department ? -1 : 0;
        const adminBonus = staff.role === USER_ROLES.ADMIN ? -0.5 : 0;
        
        const finalScore = baseScore + priorityPenalty + departmentBonus + adminBonus;

        if (finalScore < bestScore) {
          bestScore = finalScore;
          bestStaff = staff;
        }
      }

      if (!bestStaff) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Unable to determine best staff assignment'
        });
      }

      // Assign the complaint
      await complaint.assignTo(bestStaff._id, assignedBy);

      // Add internal note about auto-assignment
      complaint.internalNotes.push({
        note: `Auto-assigned based on workload analysis. Staff workload score: ${bestScore}`,
        addedBy: assignedBy,
        addedAt: new Date()
      });
      await complaint.save();

      logger.info(`Complaint ${complaintId} auto-assigned to ${bestStaff.email} (score: ${bestScore})`);

      // Populate for response
      await complaint.populate([
        { path: 'user', select: 'name email' },
        { path: 'category', select: 'name department' },
        { path: 'assignedTo', select: 'name email department' }
      ]);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Complaint auto-assigned successfully',
        data: {
          complaint,
          assignment: {
            assignedTo: bestStaff.name,
            department: bestStaff.department,
            workloadScore: bestScore,
            reason: 'Auto-assigned based on current workload and department match'
          }
        }
      });

    } catch (error) {
      logger.error('Error in auto-assignment:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
      });
    }
  }

  /**
   * Get staff performance metrics
   * GET /api/staff/performance/:staffId
   */
  static async getStaffPerformance(req, res) {
    try {
      const { staffId } = req.params;
      const { days = 30 } = req.query;

      // Validate staff member exists
      const staff = await User.findOne({
        _id: staffId,
        role: { $in: [USER_ROLES.STAFF, USER_ROLES.ADMIN] }
      }).select('name email department role');

      if (!staff) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Staff member not found'
        });
      }

      const dateRange = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get performance metrics
      const performanceData = await Complaint.aggregate([
        {
          $match: {
            assignedTo: staffId,
            createdAt: { $gte: dateRange }
          }
        },
        {
          $group: {
            _id: null,
            totalAssigned: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
              }
            },
            escalated: {
              $sum: {
                $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0]
              }
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $ne: ['$resolvedAt', null] },
                  { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60] },
                  null
                ]
              }
            },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $ne: ['$firstResponseAt', null] },
                  { $divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 1000 * 60 * 60] },
                  null
                ]
              }
            }
          }
        }
      ]);

      const performance = performanceData[0] || {
        totalAssigned: 0,
        resolved: 0,
        escalated: 0,
        avgResolutionTime: 0,
        avgResponseTime: 0
      };

      // Calculate resolution rate
      performance.resolutionRate = performance.totalAssigned > 0 
        ? ((performance.resolved / performance.totalAssigned) * 100).toFixed(1)
        : 0;

      // Calculate escalation rate
      performance.escalationRate = performance.totalAssigned > 0
        ? ((performance.escalated / performance.totalAssigned) * 100).toFixed(1)
        : 0;

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          staff: staff,
          period: `Last ${days} days`,
          performance: {
            ...performance,
            avgResolutionTime: performance.avgResolutionTime?.toFixed(1) || '0.0',
            avgResponseTime: performance.avgResponseTime?.toFixed(1) || '0.0'
          }
        }
      });

    } catch (error) {
      logger.error('Error getting staff performance:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.ERROR.SERVER_ERROR
      });
    }
  }

}

module.exports = StaffController;