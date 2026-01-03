require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

async function checkLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Check if users exist
    const users = await User.find({}).select("+password");
    console.log(`Found ${users.length} users`);

    // Test admin user specifically
    const admin = await User.findOne({ email: "admin@company.com" }).select(
      "+password"
    );

    if (!admin) {
      console.log("❌ Admin user not found!");
      return;
    }

    console.log("✅ Admin user found:", {
      email: admin.email,
      hasPassword: !!admin.password,
      passwordLength: admin.password?.length,
      isActive: admin.isActive,
    });

    // Test password comparison
    const testPasswords = ["admin123", "Admin123", "ADMIN123"];

    for (let testPass of testPasswords) {
      const isMatch = await bcrypt.compare(testPass, admin.password);
      console.log(
        `Password "${testPass}": ${isMatch ? "✅ MATCH" : "❌ No match"}`
      );
    }

    // Also test the comparePassword method if it exists
    if (admin.comparePassword) {
      const isMethodMatch = await admin.comparePassword("admin123");
      console.log(
        `Using comparePassword method with "admin123": ${
          isMethodMatch ? "✅ MATCH" : "❌ No match"
        }`
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkLogin();
