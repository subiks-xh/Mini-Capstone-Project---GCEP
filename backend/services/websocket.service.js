const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket mapping
    this.userRooms = new Map(); // userId -> rooms array
  }

  // Initialize Socket.IO with the HTTP server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(" ")[1];

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error("Socket authentication error:", error);
        next(new Error("Authentication error: Invalid token"));
      }
    });

    // Connection event handler
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });

    logger.info("WebSocket service initialized");
  }

  // Handle new socket connection
  handleConnection(socket) {
    const user = socket.user;
    logger.info(
      `User connected: ${user.name} (${user.email}), Role: ${user.role}`
    );

    // Store user connection
    this.connectedUsers.set(user._id.toString(), socket);

    // Join user to appropriate rooms based on role
    this.joinUserRooms(socket, user);

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${user.name} (${user.email})`);
      this.connectedUsers.delete(user._id.toString());
      this.userRooms.delete(user._id.toString());
    });

    // Handle joining specific complaint room
    socket.on("join_complaint", (complaintId) => {
      socket.join(`complaint_${complaintId}`);
      logger.info(`User ${user.name} joined complaint room: ${complaintId}`);
    });

    // Handle leaving complaint room
    socket.on("leave_complaint", (complaintId) => {
      socket.leave(`complaint_${complaintId}`);
      logger.info(`User ${user.name} left complaint room: ${complaintId}`);
    });

    // Handle typing indicators
    socket.on("typing_start", ({ complaintId }) => {
      socket.to(`complaint_${complaintId}`).emit("user_typing", {
        userId: user._id,
        userName: user.name,
        complaintId,
      });
    });

    socket.on("typing_end", ({ complaintId }) => {
      socket.to(`complaint_${complaintId}`).emit("user_stopped_typing", {
        userId: user._id,
        complaintId,
      });
    });

    // Send initial connection confirmation
    socket.emit("connected", {
      message: "Successfully connected to real-time notifications",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }

  // Join user to appropriate rooms based on their role
  joinUserRooms(socket, user) {
    const rooms = [];

    // All users join global notifications room
    socket.join("global_notifications");
    rooms.push("global_notifications");

    // Role-based room assignment
    switch (user.role) {
      case "admin":
        socket.join("admin_notifications");
        socket.join("staff_notifications");
        socket.join("escalation_notifications");
        rooms.push(
          "admin_notifications",
          "staff_notifications",
          "escalation_notifications"
        );
        break;

      case "staff":
        socket.join("staff_notifications");
        socket.join(`staff_${user._id}`); // Individual staff room
        rooms.push("staff_notifications", `staff_${user._id}`);
        break;

      case "user":
        socket.join(`user_${user._id}`); // Individual user room
        rooms.push(`user_${user._id}`);
        break;
    }

    this.userRooms.set(user._id.toString(), rooms);
    logger.info(`User ${user.name} joined rooms: ${rooms.join(", ")}`);
  }

  // Notification methods

  // Send complaint created notification
  notifyComplaintCreated(complaint, complainant) {
    const notification = {
      type: "complaint_created",
      title: "New Complaint Created",
      message: `${complainant.name} has created a new complaint: "${complaint.title}"`,
      data: {
        complaintId: complaint._id,
        complainantId: complainant._id,
        priority: complaint.priority,
        category: complaint.category,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify admins and staff
    this.io.to("admin_notifications").emit("notification", notification);
    this.io.to("staff_notifications").emit("notification", notification);

    logger.info(
      `Complaint created notification sent for complaint ${complaint._id}`
    );
  }

  // Send complaint status update notification
  notifyStatusUpdate(complaint, updatedBy, oldStatus, newStatus) {
    const notification = {
      type: "status_update",
      title: "Complaint Status Updated",
      message: `Complaint "${complaint.title}" status changed from ${oldStatus} to ${newStatus}`,
      data: {
        complaintId: complaint._id,
        oldStatus,
        newStatus,
        updatedBy: updatedBy._id,
        updaterName: updatedBy.name,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify the complainant
    this.io.to(`user_${complaint.user}`).emit("notification", notification);

    // Notify assigned staff if different from updater
    if (
      complaint.assignedTo &&
      complaint.assignedTo.toString() !== updatedBy._id.toString()
    ) {
      this.io
        .to(`staff_${complaint.assignedTo}`)
        .emit("notification", notification);
    }

    // Notify admins
    this.io.to("admin_notifications").emit("notification", notification);

    // Notify users in complaint room
    this.io.to(`complaint_${complaint._id}`).emit("complaint_updated", {
      complaintId: complaint._id,
      status: newStatus,
      updatedBy: updatedBy.name,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `Status update notification sent for complaint ${complaint._id}`
    );
  }

  // Send staff assignment notification
  notifyStaffAssignment(complaint, assignedStaff, assignedBy) {
    const notification = {
      type: "staff_assignment",
      title: "Complaint Assigned",
      message: `You have been assigned to complaint: "${complaint.title}"`,
      data: {
        complaintId: complaint._id,
        assignedBy: assignedBy._id,
        assignerName: assignedBy.name,
        priority: complaint.priority,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify the assigned staff member
    this.io.to(`staff_${assignedStaff._id}`).emit("notification", notification);

    // Notify complainant about assignment
    const complainantNotification = {
      type: "staff_assignment",
      title: "Staff Assigned to Your Complaint",
      message: `${assignedStaff.name} has been assigned to your complaint: "${complaint.title}"`,
      data: {
        complaintId: complaint._id,
        staffId: assignedStaff._id,
        staffName: assignedStaff.name,
      },
      timestamp: new Date().toISOString(),
    };

    this.io
      .to(`user_${complaint.user}`)
      .emit("notification", complainantNotification);

    logger.info(
      `Staff assignment notification sent for complaint ${complaint._id}`
    );
  }

  // Send escalation notification
  notifyEscalation(complaint, escalatedBy, reason) {
    const notification = {
      type: "escalation",
      title: "Complaint Escalated",
      message: `Complaint "${complaint.title}" has been escalated. Reason: ${reason}`,
      data: {
        complaintId: complaint._id,
        escalatedBy: escalatedBy._id,
        escalatorName: escalatedBy.name,
        reason,
        priority: complaint.priority,
      },
      timestamp: new Date().toISOString(),
    };

    // High priority - notify all admins immediately
    this.io.to("admin_notifications").emit("notification", notification);
    this.io
      .to("escalation_notifications")
      .emit("urgent_notification", notification);

    // Notify complainant
    const userNotification = {
      ...notification,
      message: `Your complaint "${complaint.title}" has been escalated for priority handling.`,
    };
    this.io.to(`user_${complaint.user}`).emit("notification", userNotification);

    logger.info(`Escalation notification sent for complaint ${complaint._id}`);
  }

  // Send deadline reminder notification
  notifyDeadlineReminder(complaint, hoursUntilDeadline) {
    const notification = {
      type: "deadline_reminder",
      title: "Complaint Deadline Approaching",
      message: `Complaint "${complaint.title}" deadline is in ${hoursUntilDeadline} hours`,
      data: {
        complaintId: complaint._id,
        hoursUntilDeadline,
        priority: complaint.priority,
        deadline: complaint.deadline,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify assigned staff
    if (complaint.assignedTo) {
      this.io
        .to(`staff_${complaint.assignedTo}`)
        .emit("notification", notification);
    }

    // Notify admins
    this.io.to("admin_notifications").emit("notification", notification);

    logger.info(
      `Deadline reminder notification sent for complaint ${complaint._id}`
    );
  }

  // Send overdue complaint notification
  notifyOverdueComplaint(complaint) {
    const notification = {
      type: "complaint_overdue",
      title: "Complaint Overdue",
      message: `Complaint "${complaint.title}" is now overdue!`,
      data: {
        complaintId: complaint._id,
        priority: complaint.priority,
        deadline: complaint.deadline,
        overdueDays: Math.ceil(
          (new Date() - new Date(complaint.deadline)) / (1000 * 60 * 60 * 24)
        ),
      },
      timestamp: new Date().toISOString(),
    };

    // High priority notification
    this.io.to("admin_notifications").emit("urgent_notification", notification);

    if (complaint.assignedTo) {
      this.io
        .to(`staff_${complaint.assignedTo}`)
        .emit("urgent_notification", notification);
    }

    logger.info(`Overdue notification sent for complaint ${complaint._id}`);
  }

  // Send file upload notification
  notifyFileUpload(complaint, uploadedBy, fileCount) {
    const notification = {
      type: "file_upload",
      title: "New Files Uploaded",
      message: `${uploadedBy.name} uploaded ${fileCount} file(s) to complaint "${complaint.title}"`,
      data: {
        complaintId: complaint._id,
        uploadedBy: uploadedBy._id,
        uploaderName: uploadedBy.name,
        fileCount,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify users in complaint room
    this.io.to(`complaint_${complaint._id}`).emit("notification", notification);

    // Notify assigned staff if different from uploader
    if (
      complaint.assignedTo &&
      complaint.assignedTo.toString() !== uploadedBy._id.toString()
    ) {
      this.io
        .to(`staff_${complaint.assignedTo}`)
        .emit("notification", notification);
    }

    logger.info(`File upload notification sent for complaint ${complaint._id}`);
  }

  // Send system announcement
  sendSystemAnnouncement(
    announcement,
    targetRoles = ["admin", "staff", "user"]
  ) {
    const notification = {
      type: "system_announcement",
      title: "System Announcement",
      message: announcement.message,
      data: announcement.data || {},
      timestamp: new Date().toISOString(),
    };

    // Send to appropriate role rooms
    if (targetRoles.includes("admin")) {
      this.io
        .to("admin_notifications")
        .emit("system_notification", notification);
    }
    if (targetRoles.includes("staff")) {
      this.io
        .to("staff_notifications")
        .emit("system_notification", notification);
    }
    if (targetRoles.includes("user")) {
      this.io
        .to("global_notifications")
        .emit("system_notification", notification);
    }

    logger.info(`System announcement sent to roles: ${targetRoles.join(", ")}`);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  getConnectedUsersByRole() {
    const usersByRole = { admin: 0, staff: 0, user: 0 };

    for (const socket of this.connectedUsers.values()) {
      if (socket.user && socket.user.role) {
        usersByRole[socket.user.role] =
          (usersByRole[socket.user.role] || 0) + 1;
      }
    }

    return usersByRole;
  }

  // Send real-time analytics update
  broadcastAnalyticsUpdate(analyticsData) {
    this.io.to("admin_notifications").emit("analytics_update", {
      type: "analytics_update",
      data: analyticsData,
      timestamp: new Date().toISOString(),
    });

    this.io.to("staff_notifications").emit("analytics_update", {
      type: "analytics_update",
      data: analyticsData,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
module.exports = new WebSocketService();
