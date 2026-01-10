const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs-extra");
const {
  upload,
  handleMulterError,
  deleteFile,
} = require("../middleware/upload.middleware");
const { protect } = require("../middleware/auth.middleware");
const Complaint = require("../models/Complaint");
const WebSocketService = require("../services/websocket.service");
const { AppError } = require("../middleware/error.middleware");

// Upload files to a complaint
router.post(
  "/complaint/:complaintId/upload",
  protect,
  upload.array("files", 5), // Allow up to 5 files
  async (req, res, next) => {
    try {
      const { complaintId } = req.params;

      // Find the complaint
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        // Clean up uploaded files if complaint not found
        if (req.files) {
          req.files.forEach((file) => deleteFile(file.filename));
        }
        return next(new AppError("Complaint not found", 404));
      }

      // Check if user can upload to this complaint
      const isOwner = complaint.user.toString() === req.user._id.toString();
      const isAssigned =
        complaint.assignedTo &&
        complaint.assignedTo.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAssigned && !isAdmin) {
        // Clean up uploaded files if not authorized
        if (req.files) {
          req.files.forEach((file) => deleteFile(file.filename));
        }
        return next(
          new AppError("Not authorized to upload files to this complaint", 403)
        );
      }

      if (!req.files || req.files.length === 0) {
        return next(new AppError("No files uploaded", 400));
      }

      // Process uploaded files
      const newAttachments = req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: req.user._id,
      }));

      // Add attachments to complaint
      complaint.attachments.push(...newAttachments);
      complaint.updatedAt = new Date();
      await complaint.save();

      // Send real-time notification
      try {
        WebSocketService.notifyFileUpload(
          complaint,
          req.user,
          req.files.length
        );
      } catch (socketError) {
        console.error(
          "Failed to send WebSocket file upload notification:",
          socketError
        );
        // Don't fail the request if WebSocket fails
      }

      res.status(200).json({
        success: true,
        message: `${req.files.length} file(s) uploaded successfully`,
        data: {
          attachments: newAttachments,
          totalAttachments: complaint.attachments.length,
        },
      });
    } catch (error) {
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach((file) => deleteFile(file.filename));
      }
      next(error);
    }
  }
);

// Download a file
router.get(
  "/complaint/:complaintId/download/:filename",
  protect,
  async (req, res, next) => {
    try {
      const { complaintId, filename } = req.params;

      // Find the complaint and verify file exists
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        return next(new AppError("Complaint not found", 404));
      }

      const attachment = complaint.attachments.find(
        (att) => att.filename === filename
      );
      if (!attachment) {
        return next(new AppError("File not found", 404));
      }

      // Check permissions
      const isOwner = complaint.user.toString() === req.user._id.toString();
      const isAssigned =
        complaint.assignedTo &&
        complaint.assignedTo.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAssigned && !isAdmin) {
        return next(new AppError("Not authorized to download this file", 403));
      }

      const filePath = path.join(__dirname, "../uploads/attachments", filename);

      // Check if file exists on disk
      if (!(await fs.pathExists(filePath))) {
        return next(new AppError("File not found on server", 404));
      }

      // Set appropriate headers
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.originalName}"`
      );
      res.setHeader("Content-Type", attachment.mimetype);

      // Send file
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a file
router.delete(
  "/complaint/:complaintId/attachment/:filename",
  protect,
  async (req, res, next) => {
    try {
      const { complaintId, filename } = req.params;

      // Find the complaint
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        return next(new AppError("Complaint not found", 404));
      }

      const attachmentIndex = complaint.attachments.findIndex(
        (att) => att.filename === filename
      );
      if (attachmentIndex === -1) {
        return next(new AppError("Attachment not found", 404));
      }

      const attachment = complaint.attachments[attachmentIndex];

      // Check permissions - only uploader or admin can delete
      const isUploader =
        attachment.uploadedBy.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isUploader && !isAdmin) {
        return next(new AppError("Not authorized to delete this file", 403));
      }

      // Remove file from disk
      await deleteFile(filename);

      // Remove attachment from complaint
      complaint.attachments.splice(attachmentIndex, 1);
      complaint.updatedAt = new Date();
      await complaint.save();

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get complaint attachments
router.get(
  "/complaint/:complaintId/attachments",
  protect,
  async (req, res, next) => {
    try {
      const { complaintId } = req.params;

      const complaint = await Complaint.findById(complaintId).populate(
        "attachments.uploadedBy",
        "name email"
      );

      if (!complaint) {
        return next(new AppError("Complaint not found", 404));
      }

      // Check permissions
      const isOwner = complaint.user.toString() === req.user._id.toString();
      const isAssigned =
        complaint.assignedTo &&
        complaint.assignedTo.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAssigned && !isAdmin) {
        return next(new AppError("Not authorized to view attachments", 403));
      }

      res.status(200).json({
        success: true,
        data: {
          attachments: complaint.attachments,
          totalCount: complaint.attachments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
