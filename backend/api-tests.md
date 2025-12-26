# API Testing Commands

## Test Health Check
curl http://localhost:5000/api/health

## Test User Registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password123",
    "role": "user"
  }'

## Test Staff Registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Staff",
    "email": "staff@example.com",
    "password": "Password123",
    "role": "staff",
    "department": "IT Support"
  }'

## Test Admin Registration (This should fail without admin privileges)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin@example.com",
    "password": "Password123",
    "role": "admin"
  }'

## Test Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'

## Test Get Current User (Replace TOKEN with actual JWT token from login response)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"

## Test Logout (Replace TOKEN with actual JWT token)
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"