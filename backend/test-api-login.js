const axios = require("axios");

async function testLogin() {
  try {
    console.log("Testing API login...");

    const response = await axios.post(
      "http://localhost:5000/api/auth/login",
      {
        email: "admin@company.com",
        password: "admin123",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Login successful!");
    console.log("Response:", response.data);
  } catch (error) {
    console.log("Login failed!");
    console.log("Status:", error.response?.status);
    console.log("Error:", error.response?.data);
  }
}

testLogin();
