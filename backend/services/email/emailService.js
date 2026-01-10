const nodemailer = require("nodemailer");
const logger = require("../../utils/logger");

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  /**
   * Initialize email transporter
   */
  init() {
    // For development, use ethereal email (test email service)
    // In production, use actual SMTP service like Gmail, SendGrid, etc.
    if (process.env.NODE_ENV === "production") {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Use Gmail SMTP for development if configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
      } else {
        // Fallback to console logging for development
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: "unix",
          buffer: true,
        });
        logger.info(
          "Email service initialized in development mode (console logging)"
        );
      }
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - Email HTML content
   * @param {string} options.text - Email text content
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@complaintmanagement.com",
        to,
        subject,
        html,
        text,
      };

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const result = await this.transporter.sendMail(mailOptions);
        logger.info(`Email sent successfully to ${to}:`, {
          messageId: result.messageId,
        });
        return { success: true, messageId: result.messageId };
      } else {
        // Development mode - log to console
        logger.info(`[DEV MODE] Email would be sent to: ${to}`);
        logger.info(`[DEV MODE] Subject: ${subject}`);
        logger.info(`[DEV MODE] Content: ${text || "HTML content provided"}`);
        return { success: true, messageId: "dev-mode-" + Date.now() };
      }
    } catch (error) {
      logger.error("Failed to send email:", error);
      throw error;
    }
  }

  /**
   * Send complaint created notification to user
   */
  async sendComplaintCreated(complaint, user) {
    const subject = `Complaint Submitted Successfully - #${
      complaint.ticketId || complaint._id.slice(-6).toUpperCase()
    }`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Complaint Management System</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #28a745;">Complaint Submitted Successfully</h2>
          
          <p>Dear ${user.name},</p>
          
          <p>Your complaint has been successfully submitted and assigned ticket ID: <strong>#${
            complaint.ticketId || complaint._id.slice(-6).toUpperCase()
          }</strong></p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Complaint Details:</h3>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Priority:</strong> <span style="text-transform: capitalize;">${
              complaint.priority
            }</span></p>
            <p><strong>Category:</strong> ${
              complaint.category.name || complaint.category
            }</p>
            <p><strong>Status:</strong> <span style="color: #17a2b8; text-transform: capitalize;">${complaint.status.replace(
              "-",
              " "
            )}</span></p>
            <p><strong>Submitted:</strong> ${new Date(
              complaint.createdAt
            ).toLocaleDateString()}</p>
          </div>
          
          <p>We have received your complaint and our team will review it shortly. You will receive email notifications whenever there are updates to your complaint status.</p>
          
          <p>You can track your complaint status by logging into your account on our complaint management portal.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
Complaint Submitted Successfully

Dear ${user.name},

Your complaint has been successfully submitted and assigned ticket ID: #${
      complaint.ticketId || complaint._id.slice(-6).toUpperCase()
    }

Complaint Details:
- Title: ${complaint.title}
- Priority: ${complaint.priority}
- Category: ${complaint.category.name || complaint.category}
- Status: ${complaint.status.replace("-", " ")}
- Submitted: ${new Date(complaint.createdAt).toLocaleDateString()}

We have received your complaint and our team will review it shortly. You will receive email notifications whenever there are updates to your complaint status.

You can track your complaint status by logging into your account on our complaint management portal.

This is an automated message. Please do not reply to this email.
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send status update notification to user
   */
  async sendStatusUpdate(complaint, user, previousStatus, updatedBy) {
    const subject = `Complaint Status Updated - #${
      complaint.ticketId || complaint._id.slice(-6).toUpperCase()
    }`;

    const statusColor = this.getStatusColor(complaint.status);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Complaint Management System</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: ${statusColor};">Complaint Status Updated</h2>
          
          <p>Dear ${user.name},</p>
          
          <p>Your complaint <strong>#${
            complaint.ticketId || complaint._id.slice(-6).toUpperCase()
          }</strong> status has been updated.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Status Change:</h3>
            <p><strong>From:</strong> <span style="text-transform: capitalize;">${previousStatus.replace(
              "-",
              " "
            )}</span></p>
            <p><strong>To:</strong> <span style="color: ${statusColor}; text-transform: capitalize; font-weight: bold;">${complaint.status.replace(
      "-",
      " "
    )}</span></p>
            <p><strong>Updated by:</strong> ${updatedBy.name} (${
      updatedBy.role
    })</p>
            <p><strong>Updated on:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Complaint Details:</h3>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Priority:</strong> <span style="text-transform: capitalize;">${
              complaint.priority
            }</span></p>
            <p><strong>Category:</strong> ${
              complaint.category.name || complaint.category
            }</p>
            ${
              complaint.assignedTo
                ? `<p><strong>Assigned to:</strong> ${complaint.assignedTo.name} (${complaint.assignedTo.department})</p>`
                : ""
            }
          </div>
          
          ${this.getStatusMessage(complaint.status)}
          
          <p>You can track your complaint status by logging into your account on our complaint management portal.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
Complaint Status Updated

Dear ${user.name},

Your complaint #${
      complaint.ticketId || complaint._id.slice(-6).toUpperCase()
    } status has been updated.

Status Change:
- From: ${previousStatus.replace("-", " ")}
- To: ${complaint.status.replace("-", " ")}
- Updated by: ${updatedBy.name} (${updatedBy.role})
- Updated on: ${new Date().toLocaleDateString()}

Complaint Details:
- Title: ${complaint.title}
- Priority: ${complaint.priority}
- Category: ${complaint.category.name || complaint.category}
${
  complaint.assignedTo
    ? `- Assigned to: ${complaint.assignedTo.name} (${complaint.assignedTo.department})`
    : ""
}

You can track your complaint status by logging into your account on our complaint management portal.

This is an automated message. Please do not reply to this email.
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send assignment notification to staff
   */
  async sendStaffAssignment(complaint, staffMember, assignedBy) {
    const subject = `New Complaint Assignment - #${
      complaint.ticketId || complaint._id.slice(-6).toUpperCase()
    }`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Complaint Management System</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #007bff;">New Complaint Assignment</h2>
          
          <p>Dear ${staffMember.name},</p>
          
          <p>A new complaint has been assigned to you. Please review the details below and take appropriate action.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Complaint Details:</h3>
            <p><strong>Ticket ID:</strong> #${
              complaint.ticketId || complaint._id.slice(-6).toUpperCase()
            }</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Priority:</strong> <span style="text-transform: capitalize; color: ${this.getPriorityColor(
              complaint.priority
            )}; font-weight: bold;">${complaint.priority}</span></p>
            <p><strong>Category:</strong> ${
              complaint.category.name || complaint.category
            }</p>
            <p><strong>Status:</strong> <span style="color: #28a745; text-transform: capitalize;">${complaint.status.replace(
              "-",
              " "
            )}</span></p>
            <p><strong>Customer:</strong> ${complaint.user.name} (${
      complaint.user.email
    })</p>
            <p><strong>Submitted:</strong> ${new Date(
              complaint.createdAt
            ).toLocaleDateString()}</p>
            <p><strong>Assigned by:</strong> ${assignedBy.name}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>Description:</strong></p>
            <p style="margin: 10px 0 0 0;">${complaint.description}</p>
          </div>
          
          <p>Please log into the complaint management system to view full details and update the complaint status as you work on resolving the issue.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
New Complaint Assignment

Dear ${staffMember.name},

A new complaint has been assigned to you. Please review the details below and take appropriate action.

Complaint Details:
- Ticket ID: #${complaint.ticketId || complaint._id.slice(-6).toUpperCase()}
- Title: ${complaint.title}
- Priority: ${complaint.priority}
- Category: ${complaint.category.name || complaint.category}
- Status: ${complaint.status.replace("-", " ")}
- Customer: ${complaint.user.name} (${complaint.user.email})
- Submitted: ${new Date(complaint.createdAt).toLocaleDateString()}
- Assigned by: ${assignedBy.name}

Description:
${complaint.description}

Please log into the complaint management system to view full details and update the complaint status as you work on resolving the issue.

This is an automated message. Please do not reply to this email.
    `;

    return this.sendEmail({
      to: staffMember.email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(complaint, escalatedTo) {
    const subject = `URGENT: Complaint Escalated - #${
      complaint.ticketId || complaint._id.slice(-6).toUpperCase()
    }`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ COMPLAINT ESCALATION</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #dc3545;">Complaint Has Been Escalated</h2>
          
          <p>Dear ${escalatedTo.name},</p>
          
          <p>A complaint has been escalated and requires immediate attention. This escalation occurred due to the resolution deadline being exceeded.</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #f5c6cb;">
            <h3 style="margin-top: 0; color: #721c24;">Escalated Complaint Details:</h3>
            <p><strong>Ticket ID:</strong> #${
              complaint.ticketId || complaint._id.slice(-6).toUpperCase()
            }</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Priority:</strong> <span style="text-transform: capitalize; color: #dc3545; font-weight: bold;">${
              complaint.priority
            }</span></p>
            <p><strong>Category:</strong> ${
              complaint.category.name || complaint.category
            }</p>
            <p><strong>Customer:</strong> ${complaint.user.name} (${
      complaint.user.email
    })</p>
            <p><strong>Originally Submitted:</strong> ${new Date(
              complaint.createdAt
            ).toLocaleDateString()}</p>
            <p><strong>Escalated:</strong> ${new Date().toLocaleDateString()}</p>
            ${
              complaint.assignedTo
                ? `<p><strong>Previously Assigned to:</strong> ${complaint.assignedTo.name}</p>`
                : ""
            }
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>Description:</strong></p>
            <p style="margin: 10px 0 0 0;">${complaint.description}</p>
          </div>
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #bee5eb;">
            <p style="margin: 0; color: #0c5460;"><strong>Escalation Reason:</strong> ${
              complaint.escalation.reason || "Resolution deadline exceeded"
            }</p>
          </div>
          
          <p><strong>IMMEDIATE ACTION REQUIRED:</strong> Please log into the system immediately to review and address this escalated complaint.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px;">
              This is an automated escalation message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
⚠️ COMPLAINT ESCALATION

Dear ${escalatedTo.name},

A complaint has been escalated and requires immediate attention. This escalation occurred due to the resolution deadline being exceeded.

Escalated Complaint Details:
- Ticket ID: #${complaint.ticketId || complaint._id.slice(-6).toUpperCase()}
- Title: ${complaint.title}
- Priority: ${complaint.priority}
- Category: ${complaint.category.name || complaint.category}
- Customer: ${complaint.user.name} (${complaint.user.email})
- Originally Submitted: ${new Date(complaint.createdAt).toLocaleDateString()}
- Escalated: ${new Date().toLocaleDateString()}
${
  complaint.assignedTo
    ? `- Previously Assigned to: ${complaint.assignedTo.name}`
    : ""
}

Description:
${complaint.description}

Escalation Reason: ${
      complaint.escalation.reason || "Resolution deadline exceeded"
    }

IMMEDIATE ACTION REQUIRED: Please log into the system immediately to review and address this escalated complaint.

This is an automated escalation message. Please do not reply to this email.
    `;

    return this.sendEmail({
      to: escalatedTo.email,
      subject,
      html,
      text,
    });
  }

  /**
   * Get status color for styling
   */
  getStatusColor(status) {
    switch (status) {
      case "submitted":
        return "#17a2b8";
      case "assigned":
        return "#007bff";
      case "in-progress":
        return "#ffc107";
      case "resolved":
        return "#28a745";
      case "closed":
        return "#6c757d";
      case "escalated":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }

  /**
   * Get priority color for styling
   */
  getPriorityColor(priority) {
    switch (priority) {
      case "low":
        return "#28a745";
      case "medium":
        return "#ffc107";
      case "high":
        return "#fd7e14";
      case "urgent":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }

  /**
   * Get status-specific message
   */
  getStatusMessage(status) {
    switch (status) {
      case "assigned":
        return '<p style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; border: 1px solid #bee5eb;"><strong>Good news!</strong> Your complaint has been assigned to a staff member who will begin working on it shortly.</p>';
      case "in-progress":
        return '<p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;"><strong>In Progress:</strong> Our team is actively working on resolving your complaint. We will keep you updated on the progress.</p>';
      case "resolved":
        return '<p style="background-color: #d4edda; padding: 15px; border-radius: 5px; border: 1px solid #c3e6cb;"><strong>Resolved:</strong> Your complaint has been successfully resolved. If you have any questions or are not satisfied with the resolution, please contact us.</p>';
      case "closed":
        return '<p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;"><strong>Closed:</strong> This complaint has been completed and closed. Thank you for your patience.</p>';
      case "escalated":
        return '<p style="background-color: #f8d7da; padding: 15px; border-radius: 5px; border: 1px solid #f5c6cb;"><strong>Escalated:</strong> Your complaint has been escalated to senior staff for priority handling. We will resolve this as quickly as possible.</p>';
      default:
        return "";
    }
  }
}

module.exports = new EmailService();
