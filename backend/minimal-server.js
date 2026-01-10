require("dotenv").config();
const express = require("express");
const logger = require("./utils/logger");

console.log("Starting minimal server test...");

try {
  const app = express();
  
  console.log("Express app created");
  
  // Test basic middleware
  app.use(express.json());
  console.log("JSON middleware added");
  
  // Simple route
  app.get("/test", (req, res) => {
    res.json({ message: "Server is working!" });
  });
  console.log("Test route added");
  
  // Start server
  const PORT = process.env.PORT || 5001; // Different port to avoid conflicts
  const server = app.listen(PORT, () => {
    console.log(`Minimal server running on port ${PORT}`);
    logger.info(`Minimal server running on port ${PORT}`);
  });
  
} catch (error) {
  console.error("Error in minimal server:", error);
  process.exit(1);
}