const axios = require("axios");

async function testAllLogins() {
  const accounts = [
    { email: "admin@company.com", password: "admin123", role: "Admin" },
    { email: "staff@company.com", password: "staff123", role: "Staff" },
    { email: "user@company.com", password: "user123", role: "User" },
  ];

  console.log("Testing all demo accounts...\n");

  for (const account of accounts) {
    try {
      console.log(`Testing ${account.role} account...`);
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email: account.email,
          password: account.password,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      console.log(`✅ ${account.role} login successful!`);
      console.log(`   Name: ${response.data.user.name}`);
      console.log(`   Role: ${response.data.user.role}`);
      console.log(`   Department: ${response.data.user.department}\n`);
    } catch (error) {
      console.log(`❌ ${account.role} login failed!`);
      console.log(
        `   Error: ${error.response?.data?.message || error.message}\n`
      );
    }
  }
}

testAllLogins();
