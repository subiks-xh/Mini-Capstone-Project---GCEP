const Complaint = require("../models/Complaint");
const Category = require("../models/Category");
const User = require("../models/User");
const Feedback = require("../models/Feedback");
const emailService = require("../services/email/emailService");
const WebSocketService = require("../services/websocket.service");
const {
  HTTP_STATUS,
  RESPONSE_MESSAGES,
  USER_ROLES,
  COMPLAINT_STATUS,
} = require("../config/constants");
const { asyncHandler, AppError } = require("../middleware/error.middleware");
const logger = require("../utils/logger");

/**
 * @desc    Create new complaint
 * @route   POST /api/complaints
 * @access  Private (User)
 */
const createComplaint = asyncHandler(async (req, res) => {
  const { title, description, category, priority } = req.body;

  // Verify category exists and is active
  const categoryDoc = await Category.findOne({ _id: category, isActive: true });
  if (!categoryDoc) {
    throw new AppError(
      "Category not found or inactive",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  try {
    const complaint = await Complaint.create({
      title: title.trim(),
      description: description.trim(),
      category,
      priority: priority || "medium",
      user: req.user.id,
    });

    // Populate the complaint with related data
    await complaint.populate([
      { path: "category", select: "name department resolutionTimeHours" },
      { path: "user", select: "name email" },
    ]);

    logger.info(
      `New complaint created: ${complaint._id} by user: ${req.user.email}`
    );

    // Send email notification to user
    try {
      await emailService.sendComplaintCreated(complaint, complaint.user);
      logger.info(`Email notification sent for complaint: ${complaint._id}`);
    } catch (emailError) {
      logger.error(
        `Failed to send email notification for complaint ${complaint._id}:`,
        emailError
      );
      // Don't fail the request if email fails
    }

    // Send real-time notification
    try {
      WebSocketService.notifyComplaintCreated(complaint, complaint.user);
    } catch (socketError) {
      logger.error(
        `Failed to send WebSocket notification for complaint ${complaint._id}:`,
        socketError
      );
      // Don't fail the request if WebSocket fails
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.COMPLAINT_CREATED,
      data: complaint,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      throw new AppError(messages.join(", "), HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Get all complaints (with filtering and pagination)
 * @route   GET /api/complaints
 * @access  Private (role-based access)
 */
const getComplaints = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    category,
    assignedTo,
    user,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    startDate,
    endDate,
  } = req.query;

  // Build filter based on user role
  let filter = {};

  // Role-based filtering
  if (req.user.role === USER_ROLES.USER) {
    // Users can only see their own complaints
    filter.user = req.user.id;
  } else if (req.user.role === USER_ROLES.STAFF) {
    // Staff can see complaints assigned to them or from their department
    const staffCategories = await Category.find({
      department: req.user.department,
      isActive: true,
    }).select("_id");

    filter.$or = [
      { assignedTo: req.user.id },
      { category: { $in: staffCategories.map((cat) => cat._id) } },
    ];
  }
  // Admin can see all complaints (no additional filter)

  // Apply additional filters
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (user && req.user.role !== USER_ROLES.USER) filter.user = user;

  // Date range filter
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Pagination
  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

  try {
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate("category", "name department color")
        .populate("user", "name email")
        .populate("assignedTo", "name email department")
        .populate("feedback", "rating comments")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),

      Complaint.countDocuments(filter),
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      complaints,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalComplaints: total,
        limit: parseInt(limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * @desc    Get single complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private (role-based access)
 */
const getComplaintById = asyncHandler(async (req, res) => {
  const complaintId = req.params.id;

  const complaint = await Complaint.findById(complaintId)
    .populate("category", "name department resolutionTimeHours color")
    .populate("user", "name email role")
    .populate("assignedTo", "name email department")
    .populate("feedback")
    .populate("statusHistory.updatedBy", "name email role");

  if (!complaint) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Check access permissions
  if (
    req.user.role === USER_ROLES.USER &&
    complaint.user._id.toString() !== req.user.id
  ) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.FORBIDDEN,
      HTTP_STATUS.FORBIDDEN
    );
  }

  if (req.user.role === USER_ROLES.STAFF) {
    // Staff can only view complaints assigned to them or from their department
    const category = await Category.findById(complaint.category._id);
    const hasAccess =
      (complaint.assignedTo &&
        complaint.assignedTo._id.toString() === req.user.id) ||
      (category && category.department === req.user.department);

    if (!hasAccess) {
      throw new AppError(
        RESPONSE_MESSAGES.ERROR.FORBIDDEN,
        HTTP_STATUS.FORBIDDEN
      );
    }
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    complaint,
  });
});

/**
 * @desc    Update complaint
 * @route   PUT /api/complaints/:id
 * @access  Private (Owner or Staff/Admin)
 */
const updateComplaint = asyncHandler(async (req, res) => {
  const complaintId = req.params.id;
  const { title, description, priority, category } = req.body;

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Check permissions
  const isOwner = complaint.user.toString() === req.user.id;
  const isStaffOrAdmin = [USER_ROLES.STAFF, USER_ROLES.ADMIN].includes(
    req.user.role
  );

  if (!isOwner && !isStaffOrAdmin) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.FORBIDDEN,
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Users can only update their own complaints if not resolved/closed
  if (
    isOwner &&
    [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED].includes(
      complaint.status
    )
  ) {
    throw new AppError(
      "Cannot update resolved or closed complaint",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Verify category if provided
  if (category && category !== complaint.category.toString()) {
    const categoryDoc = await Category.findOne({
      _id: category,
      isActive: true,
    });
    if (!categoryDoc) {
      throw new AppError(
        "Category not found or inactive",
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  try {
    const updateData = {};
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: "category", select: "name department color" },
      { path: "user", select: "name email" },
      { path: "assignedTo", select: "name email department" },
    ]);

    logger.info(`Complaint updated: ${complaintId} by user: ${req.user.email}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.COMPLAINT_UPDATED,
      complaint: updatedComplaint,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      throw new AppError(messages.join(", "), HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Delete complaint
 * @route   DELETE /api/complaints/:id
 * @access  Private (Owner or Admin only)
 */
const deleteComplaint = asyncHandler(async (req, res) => {
  const complaintId = req.params.id;

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Only complaint owner or admin can delete
  const isOwner = complaint.user.toString() === req.user.id;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.FORBIDDEN,
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Cannot delete resolved complaints with feedback
  if (complaint.status === COMPLAINT_STATUS.CLOSED && complaint.feedback) {
    throw new AppError(
      "Cannot delete complaint with feedback",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Delete associated feedback if exists
  if (complaint.feedback) {
    await Feedback.findByIdAndDelete(complaint.feedback);
  }

  await Complaint.findByIdAndDelete(complaintId);

  logger.info(`Complaint deleted: ${complaintId} by user: ${req.user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Complaint deleted successfully",
  });
});

/**
 * @desc    Update complaint status
 * @route   PATCH /api/complaints/:id/status
 * @access  Private (Staff/Admin only)
 */
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const complaintId = req.params.id;
  const { status, remarks } = req.body;

  const complaint = await Complaint.findById(complaintId).populate("category");
  if (!complaint) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Only staff/admin can update status
  if (![USER_ROLES.STAFF, USER_ROLES.ADMIN].includes(req.user.role)) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.FORBIDDEN,
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Staff can only update complaints from their department or assigned to them
  if (req.user.role === USER_ROLES.STAFF) {
    const hasAccess =
      (complaint.assignedTo &&
        complaint.assignedTo.toString() === req.user.id) ||
      complaint.category.department === req.user.department;

    if (!hasAccess) {
      throw new AppError(
        RESPONSE_MESSAGES.ERROR.FORBIDDEN,
        HTTP_STATUS.FORBIDDEN
      );
    }
  }

  try {
    const previousStatus = complaint.status; // Store previous status for email
    await complaint.updateStatus(status, req.user.id, remarks);

    await complaint.populate([
      { path: "user", select: "name email" },
      { path: "assignedTo", select: "name email department" },
      { path: "statusHistory.updatedBy", select: "name email role" },
    ]);

    logger.info(
      `Complaint status updated: ${complaintId} to ${status} by user: ${req.user.email}`
    );

    // Send email notification to user
    try {
      await emailService.sendStatusUpdate(
        complaint,
        complaint.user,
        previousStatus,
        req.user
      );
      logger.info(`Status update email sent for complaint: ${complaintId}`);
    } catch (emailError) {
      logger.error(
        `Failed to send status update email for complaint ${complaintId}:`,
        emailError
      );
      // Don't fail the request if email fails
    }

    // Send real-time notification
    try {
      WebSocketService.notifyStatusUpdate(
        complaint,
        req.user,
        previousStatus,
        status
      );
    } catch (socketError) {
      logger.error(
        `Failed to send WebSocket status update notification for complaint ${complaintId}:`,
        socketError
      );
      // Don't fail the request if WebSocket fails
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.STATUS_UPDATED,
      data: complaint,
    });
  } catch (error) {
    if (error.message.includes("Status is already")) {
      throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Assign complaint to staff
 * @route   PATCH /api/complaints/:id/assign
 * @access  Private (Admin only)
 */
const assignComplaint = asyncHandler(async (req, res) => {
  const complaintId = req.params.id;
  const { assignedTo } = req.body;

  const complaint = await Complaint.findById(complaintId).populate("category");
  if (!complaint) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Verify assigned user is staff and from correct department
  const staffMember = await User.findOne({
    _id: assignedTo,
    role: USER_ROLES.STAFF,
    isActive: true,
  });

  if (!staffMember) {
    throw new AppError(
      "Staff member not found or inactive",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (staffMember.department !== complaint.category.department) {
    throw new AppError(
      "Staff member must be from the same department as the complaint category",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  try {
    await complaint.assignTo(assignedTo, req.user.id);

    await complaint.populate([
      { path: "user", select: "name email" },
      { path: "assignedTo", select: "name email department" },
      { path: "statusHistory.updatedBy", select: "name email role" },
    ]);

    logger.info(
      `Complaint assigned: ${complaintId} to ${staffMember.email} by admin: ${req.user.email}`
    );

    // Send email notification to assigned staff member
    try {
      await emailService.sendStaffAssignment(complaint, staffMember, req.user);
      logger.info(
        `Assignment email sent to staff: ${staffMember.email} for complaint: ${complaintId}`
      );
    } catch (emailError) {
      logger.error(
        `Failed to send assignment email for complaint ${complaintId}:`,
        emailError
      );
      // Don't fail the request if email fails
    }

    // Send real-time notification
    try {
      WebSocketService.notifyStaffAssignment(complaint, staffMember, req.user);
    } catch (socketError) {
      logger.error(
        `Failed to send WebSocket assignment notification for complaint ${complaintId}:`,
        socketError
      );
      // Don't fail the request if WebSocket fails
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.COMPLAINT_ASSIGNED,
      data: complaint,
    });
  } catch (error) {
    if (error.message.includes("Cannot assign")) {
      throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Unassign complaint from staff
 * @route   PATCH /api/complaints/:id/unassign
 * @access  Private (Admin only)
 */
const unassignComplaint = asyncHandler(async (req, res) => {
  const complaintId = req.params.id;

  const complaint = await Complaint.findById(complaintId).populate("category");
  if (!complaint) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.COMPLAINT_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  if (!complaint.assignedTo) {
    throw new AppError(
      "Complaint is not currently assigned to any staff member",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  try {
    // Unassign the complaint
    const previouslyAssigned = complaint.assignedTo;
    complaint.assignedTo = null;
    complaint.status = COMPLAINT_STATUS.SUBMITTED;

    // Add to status history
    complaint.statusHistory.push({
      status: COMPLAINT_STATUS.SUBMITTED,
      timestamp: new Date(),
      updatedBy: req.user.id,
      remarks: "Complaint unassigned and returned to queue",
    });

    await complaint.save();

    await complaint.populate([
      { path: "user", select: "name email" },
      { path: "category", select: "name department resolutionTimeHours" },
      { path: "statusHistory.updatedBy", select: "name email role" },
    ]);

    logger.info(
      `Complaint unassigned: ${complaintId} (was assigned to ${previouslyAssigned}) by admin: ${req.user.email}`
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Complaint unassigned successfully and returned to queue",
      data: complaint,
    });
  } catch (error) {
    logger.error(`Error unassigning complaint ${complaintId}:`, error);
    throw new AppError(
      "Error unassigning complaint",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * @desc    Get complaint analytics
 * @route   GET /api/complaints/analytics
 * @access  Private (Staff/Admin)
 */
const getComplaintAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  // Role-based filtering for analytics
  let baseFilter = { ...dateFilter };
  if (req.user.role === USER_ROLES.STAFF) {
    const staffCategories = await Category.find({
      department: req.user.department,
      isActive: true,
    }).select("_id");

    baseFilter.category = { $in: staffCategories.map((cat) => cat._id) };
  }

  try {
    const [
      generalStats,
      statusDistribution,
      priorityDistribution,
      categoryStats,
    ] = await Promise.all([
      // General statistics
      Complaint.getAnalytics(dateFilter),

      // Status distribution
      Complaint.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Priority distribution
      Complaint.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Category statistics
      Complaint.aggregate([
        { $match: baseFilter },
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
            count: { $sum: 1 },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
            },
            escalatedCount: {
              $sum: {
                $cond: [{ $eq: ["$escalation.isEscalated", true] }, 1, 0],
              },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      analytics: {
        general: generalStats[0] || {
          totalComplaints: 0,
          pendingComplaints: 0,
          resolvedComplaints: 0,
          escalatedComplaints: 0,
          averageResolutionTime: 0,
        },
        statusDistribution,
        priorityDistribution,
        categoryStats,
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * @desc    Export complaints to CSV format
 * @route   GET /api/complaints/export
 * @access  Private (Staff/Admin)
 */
const exportComplaints = asyncHandler(async (req, res) => {
  try {
    // Build the filter query similar to getComplaints
    const filters = {};
    const {
      search,
      status,
      priority,
      category,
      assignedTo,
      department,
      startDate,
      endDate,
      escalated,
      hasAttachments,
      minResolutionTime,
      maxResolutionTime,
      tags,
      format = "csv",
    } = req.query;

    // Apply role-based filtering
    if (req.user.role === USER_ROLES.USER) {
      filters.user = req.user.id;
    } else if (req.user.role === USER_ROLES.STAFF && req.user.department) {
      // Staff can only see complaints from their department
      const categories = await Category.find({
        department: req.user.department,
        isActive: true,
      }).select("_id");
      filters.category = { $in: categories.map((cat) => cat._id) };
    }

    // Apply search filter
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { ticketId: { $regex: search, $options: "i" } },
      ];
    }

    // Apply status filter
    if (status) {
      const statusArray = status.split(",");
      filters.status = { $in: statusArray };
    }

    // Apply priority filter
    if (priority) {
      const priorityArray = priority.split(",");
      filters.priority = { $in: priorityArray };
    }

    // Apply category filter
    if (category) {
      const categoryArray = category.split(",");
      filters.category = { $in: categoryArray };
    }

    // Apply assigned staff filter
    if (assignedTo) {
      const assignedArray = assignedTo.split(",");
      filters.assignedTo = { $in: assignedArray };
    }

    // Apply date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.createdAt.$lte = new Date(endDate);
      }
    }

    // Apply escalated filter
    if (escalated !== undefined) {
      filters.isEscalated = escalated === "true";
    }

    // Apply attachments filter
    if (hasAttachments !== undefined) {
      if (hasAttachments === "true") {
        filters.attachments = { $exists: true, $not: { $size: 0 } };
      } else {
        filters.$or = [
          { attachments: { $exists: false } },
          { attachments: { $size: 0 } },
        ];
      }
    }

    // Apply resolution time filter
    if (minResolutionTime !== undefined || maxResolutionTime !== undefined) {
      // This is complex as we need to calculate resolution time
      // For now, we'll skip this filter in export
    }

    // Apply tags filter
    if (tags) {
      const tagsArray = tags.split(",");
      filters.tags = { $in: tagsArray };
    }

    // Fetch complaints with populated data
    const complaints = await Complaint.find(filters)
      .populate("user", "name email")
      .populate("category", "name")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Generate CSV content
    if (format.toLowerCase() === "csv") {
      // Define CSV headers
      const headers = [
        "Ticket ID",
        "Title",
        "Description",
        "Category",
        "Status",
        "Priority",
        "User Name",
        "User Email",
        "Assigned To",
        "Created At",
        "Updated At",
        "Resolution Time (Hours)",
        "Is Escalated",
        "Has Attachments",
      ];

      // Convert complaints to CSV format
      const csvRows = [headers.join(",")];

      complaints.forEach((complaint) => {
        const resolutionTime = complaint.resolvedAt
          ? Math.round(
              (new Date(complaint.resolvedAt) - new Date(complaint.createdAt)) /
                (1000 * 60 * 60)
            )
          : "";

        const row = [
          complaint.ticketId ||
            complaint._id.toString().slice(-8).toUpperCase(),
          `"${complaint.title.replace(/"/g, '""')}"`,
          `"${complaint.description.replace(/"/g, '""')}"`,
          complaint.category?.name || "Unknown",
          complaint.status,
          complaint.priority,
          complaint.user?.name || "Unknown",
          complaint.user?.email || "Unknown",
          complaint.assignedTo?.name || "Unassigned",
          new Date(complaint.createdAt).toISOString(),
          new Date(complaint.updatedAt).toISOString(),
          resolutionTime,
          complaint.isEscalated ? "Yes" : "No",
          complaint.attachments && complaint.attachments.length > 0
            ? "Yes"
            : "No",
        ];

        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");

      // Set response headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="complaints-export-${
          new Date().toISOString().split("T")[0]
        }.csv"`
      );

      return res.send(csvContent);
    }

    // Default JSON response if format is not CSV
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Complaints exported successfully",
      data: complaints,
      count: complaints.length,
    });
  } catch (error) {
    logger.error("Error exporting complaints:", error);
    throw new AppError(
      "Failed to export complaints",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  updateComplaintStatus,
  assignComplaint,
  unassignComplaint,
  getComplaintAnalytics,
  exportComplaints,
};
