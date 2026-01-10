const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");
const { AppError } = require("./error.middleware");

// Ensure upload directories exist
const uploadDir = path.join(__dirname, "../../uploads/attachments");
fs.ensureDirSync(uploadDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const fileExtension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${fileExtension}`);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // List of allowed MIME types
  const allowedTypes = [
    "image/jpeg",
    "image/png", 
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("File type not allowed", 400), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files per request
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return next(
          new AppError("File too large. Maximum file size is 5MB.", 400)
        );
      case "LIMIT_FILE_COUNT":
        return next(
          new AppError("Too many files. Maximum 5 files allowed.", 400)
        );
      case "LIMIT_UNEXPECTED_FILE":
        return next(new AppError("Unexpected file field.", 400));
      default:
        return next(new AppError("File upload error.", 400));
    }
  }
  next(error);
};

// Delete file function
const deleteFile = async (filename) => {
  try {
    const filePath = path.join(uploadDir, filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      return true;
    }
    return false;
  } catch (error) {
    throw new AppError("Error deleting file", 500);
  }
};

module.exports = {
  upload,
  handleMulterError,
  deleteFile,
  uploadDir,
};
