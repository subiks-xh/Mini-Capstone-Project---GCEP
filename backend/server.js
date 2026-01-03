require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

// Internal imports
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const { errorHandler, notFound } = require("./middleware/error.middleware");

// Routes
const authRoutes = require("./routes/auth.routes");
const complaintRoutes = require("./routes/complaint.routes");
const adminRoutes = require("./routes/admin.routes");
const staffRoutes = require("./routes/staff.routes");

// Services
const BackgroundJobsService = require("./services/backgroundJobs.service");
const { seedUsers, seedCategories } = require("./scripts/seed");

// Initialize Express app
const app = express();

// Connect to MongoDB and seed demo data
const initializeDatabase = async () => {
  try {
    await connectDB();
    // Seed demo users and categories if they don't exist
    await seedUsers();
    await seedCategories();
    logger.info("Database initialization completed");
  } catch (error) {
    logger.error("Database initialization failed:", error);
  }
};

initializeDatabase();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:5173", // Vite default port
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes default
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
    next();
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/staff", staffRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Generic Complaint Resolution & Escalation System API",
    version: "1.0.0",
    documentation: "/api/health",
    endpoints: {
      auth: "/api/auth",
      complaints: "/api/complaints",
      admin: "/api/admin",
      health: "/api/health",
    },
  });
});

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");

  // Stop background jobs first
  BackgroundJobsService.stopAll();

  if (server) {
    server.close(() => {
      logger.info("Process terminated");
    });
  }
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");

  // Stop background jobs first
  BackgroundJobsService.stopAll();

  if (server) {
    server.close(() => {
      logger.info("Process terminated");
    });
  }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Start background jobs after server is ready
  try {
    BackgroundJobsService.startAll();
    logger.info("Background jobs initialized successfully");
  } catch (error) {
    logger.error("Failed to start background jobs:", error);
  }

  // Log available routes in development
  if (process.env.NODE_ENV === "development") {
    logger.info("Available routes:");
    logger.info(`- GET  http://localhost:${PORT}/`);
    logger.info(`- GET  http://localhost:${PORT}/api/health`);
    logger.info(`- POST http://localhost:${PORT}/api/auth/register`);
    logger.info(`- POST http://localhost:${PORT}/api/auth/login`);
    logger.info(`- POST http://localhost:${PORT}/api/auth/logout`);
    logger.info(`- GET  http://localhost:${PORT}/api/auth/me`);
    logger.info(`- POST http://localhost:${PORT}/api/complaints`);
    logger.info(`- GET  http://localhost:${PORT}/api/complaints`);
    logger.info(`- GET  http://localhost:${PORT}/api/complaints/analytics`);
    logger.info(`- GET  http://localhost:${PORT}/api/admin/dashboard`);
    logger.info(`- GET  http://localhost:${PORT}/api/admin/categories`);
    logger.info(`- GET  http://localhost:${PORT}/api/admin/users`);
    logger.info(`- GET  http://localhost:${PORT}/api/staff/dashboard`);
    logger.info(
      `- GET  http://localhost:${PORT}/api/staff/available/:categoryId`
    );
    logger.info(`- POST http://localhost:${PORT}/api/staff/assign`);
  }
});

module.exports = app;
