require("dotenv").config();
const express = require("express");

console.log("Starting test server...");

try {
  console.log("Loading routes...");
  
  // Test each route import individually
  console.log("Loading auth routes...");
  const authRoutes = require("./routes/auth.routes");
  console.log("Auth routes loaded successfully");
  
  console.log("Loading complaint routes...");  
  const complaintRoutes = require("./routes/complaint.routes");
  console.log("Complaint routes loaded successfully");
  
  console.log("Loading admin routes...");
  const adminRoutes = require("./routes/admin.routes");
  console.log("Admin routes loaded successfully");
  
  console.log("Loading staff routes...");
  const staffRoutes = require("./routes/staff.routes");
  console.log("Staff routes loaded successfully");
  
  console.log("Loading upload routes...");
  const uploadRoutes = require("./routes/upload.routes");
  console.log("Upload routes loaded successfully");
  
  console.log("Loading analytics routes...");
  const analyticsRoutes = require("./routes/analytics.routes");
  console.log("Analytics routes loaded successfully");
  
  console.log("All routes loaded successfully!");
  
} catch (error) {
  console.error("Error loading routes:", error);
  process.exit(1);
}