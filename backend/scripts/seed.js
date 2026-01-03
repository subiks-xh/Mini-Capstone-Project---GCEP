require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Category = require("../models/Category");
const { USER_ROLES } = require("../config/constants");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error("Database connection failed:", error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Check if users already exist
    const existingUsers = await User.find({
      email: {
        $in: ["admin@company.com", "staff@company.com", "user@company.com"],
      },
    });

    if (existingUsers.length > 0) {
      logger.info("Demo users already exist. Skipping user creation.");
      return existingUsers;
    }

    const users = [
      {
        name: "System Administrator",
        email: "admin@company.com",
        password: "admin123",
        role: USER_ROLES.ADMIN,
        department: "IT Support",
        isActive: true,
      },
      {
        name: "Staff Member",
        email: "staff@company.com",
        password: "staff123",
        role: USER_ROLES.STAFF,
        department: "Customer Service",
        isActive: true,
      },
      {
        name: "Demo User",
        email: "user@company.com",
        password: "user123",
        role: USER_ROLES.USER,
        isActive: true,
      },
    ];

    // Hash passwords before saving
    for (let user of users) {
      user.password = await bcrypt.hash(user.password, 12);
    }

    const createdUsers = await User.insertMany(users);
    logger.info("Demo users created successfully");
    return createdUsers;
  } catch (error) {
    logger.error("Error creating demo users:", error);
    throw error;
  }
};

const seedCategories = async () => {
  try {
    // Check if categories already exist
    const existingCategories = await Category.find();

    if (existingCategories.length > 0) {
      logger.info("Categories already exist. Skipping category creation.");
      return;
    }

    // First ensure we have an admin user to assign as creator
    const adminUser = await User.findOne({ role: USER_ROLES.ADMIN });
    if (!adminUser) {
      throw new Error(
        "No admin user found. Cannot create categories without a creator."
      );
    }

    const categories = [
      {
        name: "Technical Issues",
        description: "Software bugs, system errors, and technical problems",
        department: "IT Support",
        resolutionTimeHours: 24,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: "Service Quality",
        description: "Issues related to service delivery and quality",
        department: "Customer Service",
        resolutionTimeHours: 48,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: "Billing & Payments",
        description: "Payment issues, billing disputes, and account problems",
        department: "Finance",
        resolutionTimeHours: 72,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: "Product Issues",
        description:
          "Product defects, quality issues, and functionality problems",
        department: "General",
        resolutionTimeHours: 48,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: "Customer Support",
        description: "Support team interactions and response issues",
        department: "Customer Service",
        resolutionTimeHours: 24,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: "Account Management",
        description:
          "Account access, profile updates, and account-related issues",
        department: "Administration",
        resolutionTimeHours: 48,
        isActive: true,
        createdBy: adminUser._id,
      },
    ];

    await Category.insertMany(categories);
    logger.info("Demo categories created successfully");
  } catch (error) {
    logger.error("Error creating demo categories:", error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    logger.info("Starting database seeding...");

    // Create users first, then categories (categories need admin user)
    await seedUsers();
    await seedCategories();

    logger.info("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("Database seeding failed:", error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedUsers, seedCategories, seedDatabase };
