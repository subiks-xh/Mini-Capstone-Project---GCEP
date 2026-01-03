const cron = require("node-cron");
const EscalationService = require("../services/escalation.service");
const logger = require("../utils/logger");
const { ESCALATION_CONFIG } = require("../config/constants");

/**
 * Background Jobs Service
 * Handles all scheduled tasks and background processes
 */
class BackgroundJobsService {
  static escalationJob = null;
  static isRunning = false;

  /**
   * Start all background jobs
   */
  static startAll() {
    try {
      logger.info("Starting background jobs...");

      this.startEscalationJob();

      logger.info("All background jobs started successfully");
    } catch (error) {
      logger.error("Error starting background jobs:", error);
    }
  }

  /**
   * Start the escalation monitoring job
   */
  static startEscalationJob() {
    try {
      if (this.escalationJob) {
        logger.warn("Escalation job is already running");
        return;
      }

      // Run every X minutes based on config
      const cronPattern = `*/${ESCALATION_CONFIG.CHECK_INTERVAL_MINUTES} * * * *`;

      logger.info(
        `Starting escalation job with pattern: ${cronPattern} (every ${ESCALATION_CONFIG.CHECK_INTERVAL_MINUTES} minutes)`
      );

      this.escalationJob = cron.schedule(
        cronPattern,
        async () => {
          if (this.isRunning) {
            logger.warn(
              "Previous escalation job is still running, skipping this cycle"
            );
            return;
          }

          this.isRunning = true;

          try {
            logger.info("Running scheduled escalation check...");
            const results = await EscalationService.processEscalations();

            if (results.escalated > 0 || results.errors > 0) {
              logger.info(
                `Escalation check completed: ${results.escalated} escalated, ${results.errors} errors`
              );
            }
          } catch (error) {
            logger.error("Error in scheduled escalation job:", error);
          } finally {
            this.isRunning = false;
          }
        },
        {
          scheduled: true,
          timezone: "UTC",
        }
      );

      logger.info("Escalation job scheduled successfully");
    } catch (error) {
      logger.error("Error starting escalation job:", error);
    }
  }

  /**
   * Stop the escalation job
   */
  static stopEscalationJob() {
    if (this.escalationJob) {
      this.escalationJob.stop();
      this.escalationJob = null;
      logger.info("Escalation job stopped");
    }
  }

  /**
   * Stop all background jobs
   */
  static stopAll() {
    try {
      logger.info("Stopping all background jobs...");

      this.stopEscalationJob();

      logger.info("All background jobs stopped");
    } catch (error) {
      logger.error("Error stopping background jobs:", error);
    }
  }

  /**
   * Restart all background jobs
   */
  static restartAll() {
    this.stopAll();
    setTimeout(() => {
      this.startAll();
    }, 2000); // Wait 2 seconds before restarting
  }

  /**
   * Get status of all background jobs
   */
  static getJobStatus() {
    return {
      escalationJob: {
        isActive: this.escalationJob ? true : false,
        isRunning: this.isRunning,
        intervalMinutes: ESCALATION_CONFIG.CHECK_INTERVAL_MINUTES,
        nextRun: this.escalationJob
          ? "Next scheduled run in system cron"
          : null,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Run escalation check manually (for testing/admin)
   */
  static async runEscalationManually() {
    try {
      logger.info("Running manual escalation check...");

      if (this.isRunning) {
        throw new Error(
          "Escalation job is currently running. Please wait for it to complete."
        );
      }

      const results = await EscalationService.processEscalations();
      logger.info("Manual escalation check completed:", results);

      return results;
    } catch (error) {
      logger.error("Error in manual escalation check:", error);
      throw error;
    }
  }

  /**
   * Update escalation job frequency
   * @param {number} minutes - New interval in minutes
   */
  static updateEscalationInterval(minutes) {
    if (minutes < 5 || minutes > 1440) {
      // Between 5 minutes and 24 hours
      throw new Error(
        "Escalation interval must be between 5 minutes and 1440 minutes (24 hours)"
      );
    }

    logger.info(
      `Updating escalation interval from ${ESCALATION_CONFIG.CHECK_INTERVAL_MINUTES} to ${minutes} minutes`
    );

    // Stop current job
    this.stopEscalationJob();

    // Update config (in production, this would update a config file or database)
    ESCALATION_CONFIG.CHECK_INTERVAL_MINUTES = minutes;

    // Restart with new interval
    this.startEscalationJob();

    return this.getJobStatus();
  }

  /**
   * Schedule one-time complaint check for specific complaint ID
   * @param {string} complaintId
   * @param {number} delayMinutes
   */
  static scheduleComplaintCheck(complaintId, delayMinutes = 5) {
    const runAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    logger.info(`Scheduling complaint check for ${complaintId} at ${runAt}`);

    // Create a one-time job
    const oneTimeJob = cron.schedule(
      `${runAt.getMinutes()} ${runAt.getHours()} ${runAt.getDate()} ${
        runAt.getMonth() + 1
      } *`,
      async () => {
        try {
          logger.info(`Running scheduled check for complaint: ${complaintId}`);

          // Check if this specific complaint needs escalation
          const Complaint = require("../models/Complaint");
          const complaint = await Complaint.findById(complaintId).populate(
            "user category assignedTo"
          );

          if (!complaint) {
            logger.warn(
              `Complaint ${complaintId} not found for scheduled check`
            );
            return;
          }

          // Check if complaint is overdue and not escalated
          if (
            complaint.deadline < new Date() &&
            !complaint.escalation.isEscalated &&
            !["resolved", "closed"].includes(complaint.status)
          ) {
            await EscalationService.escalateComplaint(complaint);
            logger.info(
              `Complaint ${complaintId} escalated via scheduled check`
            );
          }

          // Destroy the one-time job
          oneTimeJob.destroy();
        } catch (error) {
          logger.error(
            `Error in scheduled complaint check for ${complaintId}:`,
            error
          );
          oneTimeJob.destroy();
        }
      },
      {
        scheduled: false,
        timezone: "UTC",
      }
    );

    // Start the one-time job
    oneTimeJob.start();

    return {
      complaintId,
      scheduledFor: runAt,
      message: `Complaint check scheduled for ${runAt}`,
    };
  }

  /**
   * Get escalation preview (what would be escalated now)
   */
  static async getEscalationPreview() {
    try {
      return await EscalationService.previewEscalations();
    } catch (error) {
      logger.error("Error getting escalation preview:", error);
      throw error;
    }
  }

  /**
   * Get complaints at risk of escalation
   */
  static async getAtRiskComplaints() {
    try {
      return await EscalationService.getAtRiskComplaints();
    } catch (error) {
      logger.error("Error getting at-risk complaints:", error);
      throw error;
    }
  }
}

module.exports = BackgroundJobsService;
