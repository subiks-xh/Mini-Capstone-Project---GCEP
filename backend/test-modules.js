console.log("=== SERVER DEBUGGING ===");
console.log("Starting server test...");

try {
  console.log("Loading dependencies...");
  require("dotenv").config();
  const express = require("express");
  console.log("Express loaded successfully");

  const connectDB = require("./config/db");
  console.log("Database config loaded");

  const logger = require("./utils/logger");
  console.log("Logger loaded");

  console.log("Loading routes...");
  const authRoutes = require("./routes/auth.routes");
  console.log("Auth routes loaded");

  const complaintRoutes = require("./routes/complaint.routes");
  console.log("Complaint routes loaded");

  const adminRoutes = require("./routes/admin.routes");
  console.log("Admin routes loaded");

  const staffRoutes = require("./routes/staff.routes");
  console.log("Staff routes loaded");

  const uploadRoutes = require("./routes/upload.routes");
  console.log("Upload routes loaded");

  const analyticsRoutes = require("./routes/analytics.routes");
  console.log("Analytics routes loaded");

  console.log("Loading services...");
  const BackgroundJobsService = require("./services/backgroundJobs.service");
  console.log("Background jobs service loaded");

  const WebSocketService = require("./services/websocket.service");
  console.log("WebSocket service loaded");

  console.log("Loading seed functions...");
  const { seedUsers, seedCategories } = require("./scripts/seed");
  console.log("Seed functions loaded");

  console.log("=== ALL MODULES LOADED SUCCESSFULLY ===");
  console.log("Server initialization should work now");

} catch (error) {
  console.error("=== ERROR LOADING MODULE ===");
  console.error("Error:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
}