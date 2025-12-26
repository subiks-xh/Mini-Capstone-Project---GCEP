# PowerShell API Test Script
Write-Host "🚀 Testing Complaint Management System API..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"

try {
    # Test 1: Health Check
    Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -ContentType "application/json"
    Write-Host "✅ Health Check Success:" -ForegroundColor Green
    $healthResponse | ConvertTo-Json -Depth 3 | Write-Host
    Write-Host ""

    # Test 2: User Registration
    Write-Host "2. Testing User Registration..." -ForegroundColor Yellow
    $registerData = @{
        name = "John Doe"
        email = "john@example.com"
        password = "Password123"
        role = "user"
    } | ConvertTo-Json
    
    try {
        $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
        Write-Host "✅ User Registration Success:" -ForegroundColor Green
        $registerResponse | ConvertTo-Json -Depth 3 | Write-Host
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "ℹ️  User already exists, continuing..." -ForegroundColor Blue
        }
        else {
            throw
        }
    }
    Write-Host ""

    # Test 3: Staff Registration  
    Write-Host "3. Testing Staff Registration..." -ForegroundColor Yellow
    $staffData = @{
        name = "Jane Smith"
        email = "jane.staff@example.com"
        password = "Password123"
        role = "staff"
        department = "IT Support"
    } | ConvertTo-Json
    
    try {
        $staffResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $staffData -ContentType "application/json"
        Write-Host "✅ Staff Registration Success:" -ForegroundColor Green
        $staffResponse | ConvertTo-Json -Depth 3 | Write-Host
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "ℹ️  Staff user already exists, continuing..." -ForegroundColor Blue
        }
        else {
            throw
        }
    }
    Write-Host ""

    # Test 4: Admin Registration (should fail)
    Write-Host "4. Testing Admin Registration (should fail)..." -ForegroundColor Yellow
    $adminData = @{
        name = "Admin User"
        email = "admin@example.com"
        password = "Password123"
        role = "admin"
    } | ConvertTo-Json
    
    try {
        $adminResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $adminData -ContentType "application/json"
        Write-Host "❌ Admin Registration Should Have Failed!" -ForegroundColor Red
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            Write-Host "✅ Admin Registration Correctly Blocked" -ForegroundColor Green
        }
        else {
            throw
        }
    }
    Write-Host ""

    # Test 5: Login
    Write-Host "5. Testing User Login..." -ForegroundColor Yellow
    $loginData = @{
        email = "john@example.com"
        password = "Password123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login Success:" -ForegroundColor Green
    @{
        message = $loginResponse.message
        user = $loginResponse.user
        tokenExists = [bool]$token
    } | ConvertTo-Json -Depth 3 | Write-Host
    Write-Host ""

    # Test 6: Protected Route
    Write-Host "6. Testing Protected Route (/api/auth/me)..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers -ContentType "application/json"
    Write-Host "✅ Protected Route Success:" -ForegroundColor Green
    $meResponse | ConvertTo-Json -Depth 3 | Write-Host
    Write-Host ""

    # Test 7: Logout
    Write-Host "7. Testing Logout..." -ForegroundColor Yellow
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" -Method POST -Headers $headers -ContentType "application/json"
    Write-Host "✅ Logout Success:" -ForegroundColor Green
    $logoutResponse | ConvertTo-Json -Depth 3 | Write-Host
    Write-Host ""

    Write-Host "🎉 All API tests completed successfully!" -ForegroundColor Green

}
catch {
    Write-Host "❌ API Test Failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $result = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($result)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}