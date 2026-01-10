const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Log connection events
    mongoose.connection.on("connected", () => {
      logger.info("Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("Mongoose disconnected from MongoDB");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (error) {
        logger.error("Error during MongoDB shutdown:", error);
        process.exit(1);
      }
    });

    return true;
  } catch (error) {
    logger.error("Database connection error:", error);
    logger.warn(
      "Continuing without database connection - some features may not work"
    );
    return false;
  }
};

module.exports = connectDB;
