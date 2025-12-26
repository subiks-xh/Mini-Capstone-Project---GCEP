// Simple API test script
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🚀 Testing Complaint Management System API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test user registration
    console.log('2. Testing User Registration...');
    const registerData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      role: 'user'
    };
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
      console.log('✅ User Registration Success:', registerResponse.data);
    } catch (registerError) {
      if (registerError.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️  User already exists, continuing...');
      } else {
        throw registerError;
      }
    }
    console.log('');

    // Test staff registration
    console.log('3. Testing Staff Registration...');
    const staffData = {
      name: 'Jane Smith',
      email: 'jane.staff@example.com',
      password: 'Password123',
      role: 'staff',
      department: 'IT Support'
    };
    
    try {
      const staffRegisterResponse = await axios.post(`${BASE_URL}/api/auth/register`, staffData);
      console.log('✅ Staff Registration Success:', staffRegisterResponse.data);
    } catch (staffError) {
      if (staffError.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️  Staff user already exists, continuing...');
      } else {
        throw staffError;
      }
    }
    console.log('');

    // Test admin registration (should fail)
    console.log('4. Testing Admin Registration (should fail)...');
    const adminData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Password123',
      role: 'admin'
    };
    
    try {
      const adminRegisterResponse = await axios.post(`${BASE_URL}/api/auth/register`, adminData);
      console.log('❌ Admin Registration Should Have Failed!');
    } catch (adminError) {
      if (adminError.response?.status === 403) {
        console.log('✅ Admin Registration Correctly Blocked:', adminError.response.data.message);
      } else {
        throw adminError;
      }
    }
    console.log('');

    // Test login
    console.log('5. Testing User Login...');
    const loginData = {
      email: 'john@example.com',
      password: 'Password123'
    };
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    const token = loginResponse.data.token;
    console.log('✅ Login Success:', {
      message: loginResponse.data.message,
      user: loginResponse.data.user,
      tokenExists: !!token
    });
    console.log('');

    // Test protected route
    console.log('6. Testing Protected Route (/api/auth/me)...');
    const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Protected Route Success:', meResponse.data);
    console.log('');

    // Test logout
    console.log('7. Testing Logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Logout Success:', logoutResponse.data);
    console.log('');

    console.log('🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API Test Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the tests
testAPI();