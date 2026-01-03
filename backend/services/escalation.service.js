const Complaint = require('../models/Complaint');
const User = require('../models/User');
const logger = require('../utils/logger');
const { 
  COMPLAINT_STATUS, 
  USER_ROLES,
  ESCALATION_CONFIG 
} = require('../config/constants');

/**
 * Escalation Service
 * Handles automatic escalation of overdue complaints
 */
class EscalationService {
  
  /**
   * Process all complaints that are due for escalation
   * This method is called by the cron job
   */
  static async processEscalations() {
    try {
      logger.info('Starting escalation process...');

      // Get complaints due for escalation
      const overdueComplaints = await Complaint.getDueForEscalation();
      
      if (overdueComplaints.length === 0) {
        logger.info('No complaints found for escalation');
        return { escalated: 0, errors: 0 };
      }

      logger.info(`Found ${overdueComplaints.length} complaints due for escalation`);

      const results = {
        escalated: 0,
        errors: 0,
        details: []
      };

      // Process each overdue complaint
      for (const complaint of overdueComplaints) {
        try {
          await this.escalateComplaint(complaint);
          results.escalated++;
          results.details.push({
            complaintId: complaint._id,
            status: 'escalated',
            reason: 'Deadline exceeded'
          });
        } catch (error) {
          logger.error(`Failed to escalate complaint ${complaint._id}:`, error);
          results.errors++;
          results.details.push({
            complaintId: complaint._id,
            status: 'error',
            error: error.message
          });
        }
      }

      logger.info(`Escalation process completed: ${results.escalated} escalated, ${results.errors} errors`);
      
      // If there were escalations, notify administrators
      if (results.escalated > 0) {
        await this.notifyAdministrators(results);
      }

      return results;
    } catch (error) {
      logger.error('Error in escalation process:', error);
      throw error;
    }
  }

  /**
   * Escalate a specific complaint
   * @param {Object} complaint - The complaint to escalate
   */
  static async escalateComplaint(complaint) {
    try {
      // Find an admin user to assign as escalator
      const adminUser = await User.findOne({ 
        role: USER_ROLES.ADMIN, 
        isActive: true 
      });

      if (!adminUser) {
        throw new Error('No active admin user found for escalation');
      }

      // Calculate how long the complaint is overdue
      const overdueHours = Math.floor((Date.now() - complaint.deadline) / (1000 * 60 * 60));
      const reason = `Complaint exceeded deadline by ${overdueHours} hours`;

      // Escalate the complaint
      await complaint.escalate(adminUser._id, reason);

      // Log the escalation
      logger.warn(`Complaint escalated: ${complaint._id} - ${complaint.title} (User: ${complaint.user.email})`);

      // TODO: Send notification emails/SMS
      await this.sendEscalationNotifications(complaint, adminUser, reason);

    } catch (error) {
      logger.error(`Error escalating complaint ${complaint._id}:`, error);
      throw error;
    }
  }

  /**
   * Get escalation statistics
   */
  static async getEscalationStats(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let matchStage = { 'escalation.isEscalated': true };

      if (startDate && endDate) {
        matchStage['escalation.escalatedAt'] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const stats = await Complaint.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalEscalated: { $sum: 1 },
            avgOverdueHours: {
              $avg: {
                $divide: [
                  { $subtract: ['$escalation.escalatedAt', '$deadline'] },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            },
            categoryBreakdown: {
              $push: {
                category: '$category',
                escalatedAt: '$escalation.escalatedAt',
                overdueHours: {
                  $divide: [
                    { $subtract: ['$escalation.escalatedAt', '$deadline'] },
                    1000 * 60 * 60
                  ]
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryBreakdown.category',
            foreignField: '_id',
            as: 'categoryData'
          }
        }
      ]);

      // Get category-wise escalation stats
      const categoryStats = await Complaint.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryData'
          }
        },
        { $unwind: '$categoryData' },
        {
          $group: {
            _id: '$categoryData._id',
            categoryName: { $first: '$categoryData.name' },
            department: { $first: '$categoryData.department' },
            escalationCount: { $sum: 1 },
            avgOverdueHours: {
              $avg: {
                $divide: [
                  { $subtract: ['$escalation.escalatedAt', '$deadline'] },
                  1000 * 60 * 60
                ]
              }
            }
          }
        },
        { $sort: { escalationCount: -1 } }
      ]);

      return {
        general: stats[0] || {
          totalEscalated: 0,
          avgOverdueHours: 0,
          categoryBreakdown: []
        },
        byCategory: categoryStats
      };

    } catch (error) {
      logger.error('Error getting escalation stats:', error);
      throw error;
    }
  }

  /**
   * Get complaints at risk of escalation
   * @param {number} hoursBuffer - Hours before deadline to consider "at risk"
   */
  static async getAtRiskComplaints(hoursBuffer = ESCALATION_CONFIG.BUFFER_HOURS) {
    try {
      const riskDeadline = new Date(Date.now() + hoursBuffer * 60 * 60 * 1000);

      const atRiskComplaints = await Complaint.find({
        deadline: { $lt: riskDeadline, $gt: new Date() },
        status: { 
          $nin: [
            COMPLAINT_STATUS.RESOLVED, 
            COMPLAINT_STATUS.CLOSED, 
            COMPLAINT_STATUS.ESCALATED
          ] 
        },
        'escalation.isEscalated': false
      })
      .populate('user', 'name email')
      .populate('category', 'name department resolutionTimeHours')
      .populate('assignedTo', 'name email department')
      .sort({ deadline: 1 });

      // Calculate time remaining for each complaint
      const complaintsWithTimeInfo = atRiskComplaints.map(complaint => ({
        ...complaint.toObject(),
        hoursUntilDeadline: Math.floor((complaint.deadline - Date.now()) / (1000 * 60 * 60)),
        minutesUntilDeadline: Math.floor((complaint.deadline - Date.now()) / (1000 * 60)),
        riskLevel: this.calculateRiskLevel(complaint.deadline)
      }));

      return complaintsWithTimeInfo;
    } catch (error) {
      logger.error('Error getting at-risk complaints:', error);
      throw error;
    }
  }

  /**
   * Calculate risk level based on time until deadline
   * @param {Date} deadline 
   */
  static calculateRiskLevel(deadline) {
    const hoursUntilDeadline = (deadline - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline <= 1) return 'critical';
    if (hoursUntilDeadline <= 4) return 'high';
    if (hoursUntilDeadline <= 12) return 'medium';
    return 'low';
  }

  /**
   * Manually escalate a complaint (admin action)
   * @param {string} complaintId 
   * @param {string} adminId 
   * @param {string} reason 
   */
  static async manualEscalation(complaintId, adminId, reason = 'Manual escalation by administrator') {
    try {
      const complaint = await Complaint.findById(complaintId)
        .populate('user category assignedTo');

      if (!complaint) {
        throw new Error('Complaint not found');
      }

      if (complaint.escalation.isEscalated) {
        throw new Error('Complaint is already escalated');
      }

      if ([COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED].includes(complaint.status)) {
        throw new Error('Cannot escalate resolved or closed complaint');
      }

      const admin = await User.findById(adminId);
      if (!admin || admin.role !== USER_ROLES.ADMIN) {
        throw new Error('Only administrators can manually escalate complaints');
      }

      // Escalate the complaint
      await complaint.escalate(adminId, reason);

      logger.info(`Manual escalation: ${complaintId} by admin: ${admin.email}`);

      // Send notifications
      await this.sendEscalationNotifications(complaint, admin, reason);

      return complaint;
    } catch (error) {
      logger.error(`Error in manual escalation:`, error);
      throw error;
    }
  }

  /**
   * Send escalation notifications
   * @param {Object} complaint 
   * @param {Object} escalatedBy 
   * @param {string} reason 
   */
  static async sendEscalationNotifications(complaint, escalatedBy, reason) {
    try {
      // TODO: Implement email/SMS notifications
      logger.info(`Escalation notifications sent for complaint: ${complaint._id}`);
      
      // For now, just log the notification details
      const notificationData = {
        complaintId: complaint._id,
        complaintTitle: complaint.title,
        userEmail: complaint.user?.email,
        assignedTo: complaint.assignedTo?.email,
        escalatedBy: escalatedBy.email,
        reason: reason,
        escalatedAt: new Date()
      };

      logger.info('Escalation notification data:', notificationData);

      // TODO: Integrate with notification service (email/SMS)
      // await NotificationService.sendEscalationEmail(notificationData);
      
    } catch (error) {
      logger.error('Error sending escalation notifications:', error);
      // Don't throw here as this shouldn't stop the escalation process
    }
  }

  /**
   * Notify administrators about escalation batch results
   * @param {Object} results 
   */
  static async notifyAdministrators(results) {
    try {
      const admins = await User.find({ 
        role: USER_ROLES.ADMIN, 
        isActive: true 
      }).select('email name');

      // TODO: Send summary email to administrators
      logger.info(`Admin notification sent: ${results.escalated} complaints escalated`);

      // Log admin notification data
      const notificationData = {
        escalatedCount: results.escalated,
        errorCount: results.errors,
        timestamp: new Date(),
        details: results.details
      };

      logger.info('Admin escalation summary:', notificationData);

    } catch (error) {
      logger.error('Error notifying administrators:', error);
    }
  }

  /**
   * Get escalation settings and configuration
   */
  static getEscalationConfig() {
    return {
      checkIntervalMinutes: ESCALATION_CONFIG.CHECK_INTERVAL_MINUTES,
      bufferHours: ESCALATION_CONFIG.BUFFER_HOURS,
      enabled: true, // This could be made configurable
      notificationsEnabled: true,
      autoAssignToAdmin: true
    };
  }

  /**
   * Preview what would be escalated (for admin interface)
   */
  static async previewEscalations() {
    try {
      const overdueComplaints = await Complaint.getDueForEscalation();
      
      return {
        count: overdueComplaints.length,
        complaints: overdueComplaints.map(complaint => ({
          id: complaint._id,
          title: complaint.title,
          user: complaint.user?.name || 'Unknown',
          category: complaint.category?.name || 'Unknown',
          deadline: complaint.deadline,
          overdueHours: Math.floor((Date.now() - complaint.deadline) / (1000 * 60 * 60)),
          assignedTo: complaint.assignedTo?.name || 'Unassigned'
        }))
      };
    } catch (error) {
      logger.error('Error previewing escalations:', error);
      throw error;
    }
  }
}

module.exports = EscalationService;