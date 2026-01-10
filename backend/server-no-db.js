require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");

console.log("Starting server without MongoDB...");

try {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(cors());
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "API is running without database",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: "1.0.0",
    });
  });
  
  // Start server
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    logger.info(`Server running without database on port ${PORT}`);
    console.log(`Server running on port ${PORT} - ready for testing!`);
  });
  
} catch (error) {
  logger.error("Server startup error:", error);
  console.error("Server startup error:", error);
  process.exit(1);
}