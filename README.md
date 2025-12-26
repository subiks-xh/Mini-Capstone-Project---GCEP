# Generic Complaint Resolution & Escalation System

A production-ready, enterprise-grade MERN stack web application for managing complaints with automated escalation, role-based access, and comprehensive tracking capabilities.

## 🚀 Project Overview

**Status:** ✅ Day 1 Completed - Backend Foundation with Authentication

This system solves the critical business problem of centralized complaint management, providing:
- **Transparency & Tracking**: Real-time complaint status monitoring
- **Staff Accountability**: Clear assignment and resolution responsibilities  
- **Automated Escalation**: Time-based escalation to prevent delays
- **User Satisfaction**: Comprehensive feedback and closure workflow

## 🏗️ System Architecture

### **Tech Stack**
- **Backend**: Node.js, Express.js, MongoDB, JWT Authentication
- **Frontend**: React.js with Vite (Coming in Day 5)
- **Database**: MongoDB with Mongoose ODM
- **Security**: bcrypt, Helmet, CORS, Rate Limiting
- **Deployment**: Production-ready for Render/Railway + MongoDB Atlas

### **User Roles**
1. **User (Complainant)** - Submit and track complaints, provide feedback
2. **Staff (Resolver)** - Manage assigned complaints, update status
3. **Admin (Supervisor)** - Full system management, analytics, escalations

## 📅 Development Progress

### ✅ Day 1: Project Setup & Backend Foundation (COMPLETED)
- [x] Complete project structure created
- [x] Backend initialized with Express.js
- [x] MongoDB connection configured  
- [x] User model with role-based schema
- [x] JWT authentication system implemented
- [x] Security middleware (auth, validation, error handling)
- [x] API routes for registration/login/logout
- [x] Production-grade logging with Winston
- [x] Rate limiting and CORS protection

### 🎯 Upcoming Days
- **Day 2**: Complaint Models & Core APIs
- **Day 3**: Admin Features  
- **Day 4**: Escalation System
- **Day 5**: Frontend Setup & Auth UI
- **Day 6-10**: Complete frontend, testing, deployment

## 🗄️ Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  name: String (2-50 chars, letters/spaces only),
  email: String (unique, indexed),
  password: String (hashed with bcrypt),
  role: Enum ['user', 'staff', 'admin'],
  department: String (required for staff),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Authentication System

### Features Implemented
- **JWT Token-based Authentication** with secure httpOnly cookies
- **Password Hashing** using bcrypt with 12 rounds
- **Role-based Access Control** middleware
- **Rate Limiting** for auth endpoints (5 login attempts per 15min)
- **Input Validation** with express-validator
- **Secure Cookie Management** with CSRF protection

### API Endpoints (Day 1)
```
POST /api/auth/register - User registration
POST /api/auth/login - User authentication  
POST /api/auth/logout - Secure logout
GET  /api/auth/me - Get current user profile
PUT  /api/auth/password - Update password
POST /api/auth/refresh - Refresh JWT token
GET  /api/health - System health check
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start development server
npm run dev

# Or start production server
npm start
```

### Environment Variables
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/complaint-management
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
BCRYPT_ROUNDS=12
CLIENT_URL=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 API Testing

The backend includes comprehensive API tests. You can test using:

1. **cURL** (see `api-tests.md`)
2. **Postman/Thunder Client**  
3. **PowerShell script** (`test-api.ps1`)
4. **Node.js script** (`test-api.js`)

### Sample API Usage
```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com", 
    "password": "Password123",
    "role": "user"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

## 🔒 Security Features

- **Helmet.js** for security headers
- **CORS** configured for frontend origin
- **Rate Limiting** per IP address
- **Input Sanitization** and validation
- **JWT Secure Cookies** with httpOnly flag
- **Password Complexity** requirements
- **Admin Role Protection** (only existing admins can create admin accounts)
- **Graceful Error Handling** without sensitive data exposure

## 📊 Logging & Monitoring

- **Winston Logger** for structured logging
- **Request/Response Logging** in development
- **Error Tracking** with stack traces
- **Graceful Shutdown** handling
- **Health Check Endpoint** for monitoring

## 🚀 Next Steps (Day 2)

1. Create Complaint model with lifecycle states
2. Implement Category and Department models
3. Build complaint CRUD operations
4. Add advanced filtering and pagination
5. Implement status history tracking

## 📝 Development Standards

- **Clean Architecture** with separation of concerns
- **Production-grade Error Handling** at every layer
- **Comprehensive Input Validation**
- **Meaningful Git Commits** following conventional commits
- **Extensive API Documentation**
- **Security-first Development**

---

**Project Goal**: Build a complaint management system that showcases full-stack expertise, clean architecture, and real-world problem-solving skills for portfolio demonstration and user validation.

**Repository**: `complaint-escalation-system`  
**Version**: 1.0.0  
**License**: MIT

---

> 💡 **Elite Development Approach**: This project follows enterprise-grade development practices with production-ready code, comprehensive error handling, and scalable architecture suitable for real-world deployment.