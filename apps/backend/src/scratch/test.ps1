# ShopManager Pro Phase 1 Backend API Test Script
$BaseUrl = "http://localhost:3001/v1"
$StoreId = "6a15233ef521ebb0d9f08e4b"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "STARTING BACKEND PHASE 1 INTEGRATION TESTS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Helper to print responses
function Print-Response($title, $response) {
    Write-Host "`n--- $title ---" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5 | Write-Host
}

# 1. Health Check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    Print-Response "1. Health Check" $health
} catch {
    Write-Error "Health check failed: $_"
    exit 1
}

# 2. Login as Admin
Write-Host "`nLogging in as Admin..." -ForegroundColor Cyan
$loginAdminBody = @{
    phone = "+22236123456"
    password = "password123"
    storeId = $StoreId
} | ConvertTo-Json

try {
    $adminLoginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginAdminBody -ContentType "application/json"
    Print-Response "2. Admin Login Success" $adminLoginRes
    $adminAccessToken = $adminLoginRes.data.accessToken
    $adminRefreshToken = $adminLoginRes.data.refreshToken
} catch {
    Write-Error "Admin login failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    exit 1
}

# 3. Login as Employee
Write-Host "`nLogging in as Employee..." -ForegroundColor Cyan
$loginEmployeeBody = @{
    phone = "+22236123457"
    password = "password123"
    storeId = $StoreId
} | ConvertTo-Json

try {
    $employeeLoginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginEmployeeBody -ContentType "application/json"
    Print-Response "3. Employee Login Success" $employeeLoginRes
    $employeeAccessToken = $employeeLoginRes.data.accessToken
} catch {
    Write-Error "Employee login failed: $_"
    exit 1
}

# 4. Get profile /auth/me for Admin
Write-Host "`nFetching /auth/me for Admin..." -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $adminAccessToken" }
try {
    $adminMe = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method Get -Headers $headers
    Print-Response "4. Admin Me Details" $adminMe
} catch {
    Write-Error "Admin /auth/me failed: $_"
}

# 5. Fetch /users/me for Employee
Write-Host "`nFetching /users/me for Employee..." -ForegroundColor Cyan
$empHeaders = @{ Authorization = "Bearer $employeeAccessToken" }
try {
    $empUserMe = Invoke-RestMethod -Uri "$BaseUrl/users/me" -Method Get -Headers $empHeaders
    Print-Response "5. Employee User Me Details" $empUserMe
} catch {
    Write-Error "Employee /users/me failed: $_"
}

# 6. Update user profile /users/me for Admin
Write-Host "`nUpdating profile for Admin..." -ForegroundColor Cyan
$updateBody = @{ name = "Ahmed Admin Updated" } | ConvertTo-Json
try {
    $updateRes = Invoke-RestMethod -Uri "$BaseUrl/users/me" -Method Patch -Body $updateBody -ContentType "application/json" -Headers $headers
    Print-Response "6. Update Profile Success" $updateRes
} catch {
    Write-Error "Update profile failed: $_"
}

# 7. Admin creates a new Employee
Write-Host "`nCreating new Employee (Admin role required)..." -ForegroundColor Cyan
$createEmployeeBody = @{
    employeeNumber = "EMP002"
    position = "caissier"
    name = "Mohamed New"
    phone = "+22236123459"
    password = "password123"
    role = "employee"
    salary = 12000
    commissionRate = 0.01
} | ConvertTo-Json

try {
    $newEmployeeRes = Invoke-RestMethod -Uri "$BaseUrl/admin/employees" -Method Post -Body $createEmployeeBody -ContentType "application/json" -Headers $headers
    Print-Response "7. Create Employee Success" $newEmployeeRes
    $newEmployeeId = $newEmployeeRes.data._id
} catch {
    Write-Error "Create employee failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

# 8. RBAC validation: Employee attempts to create an Employee (Should fail with 403)
Write-Host "`nTesting RBAC (Employee trying to create Employee - should fail)..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BaseUrl/admin/employees" -Method Post -Body $createEmployeeBody -ContentType "application/json" -Headers $empHeaders
    Write-Error "RBAC test failed: Employee was able to access Admin endpoint!"
} catch {
    Write-Host "Correctly blocked by RBAC: $_" -ForegroundColor Green
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response body: $($reader.ReadToEnd())" -ForegroundColor Green
    }
}

# 9. List Employees as Admin
Write-Host "`nListing Employees as Admin..." -ForegroundColor Cyan
try {
    $listRes = Invoke-RestMethod -Uri "$BaseUrl/admin/employees?page=1&limit=5" -Method Get -Headers $headers
    Print-Response "9. List Employees" $listRes
} catch {
    Write-Error "List employees failed: $_"
}

# 10. Admin updates Employee position/salary
if ($newEmployeeId) {
    Write-Host "`nUpdating Employee position and salary..." -ForegroundColor Cyan
    $updateEmployeeBody = @{
        position = "superviseur"
        salary = 14000
    } | ConvertTo-Json
    try {
        $updateEmpRes = Invoke-RestMethod -Uri "$BaseUrl/admin/employees/$newEmployeeId" -Method Patch -Body $updateEmployeeBody -ContentType "application/json" -Headers $headers
        Print-Response "10. Update Employee Success" $updateEmpRes
    } catch {
        Write-Error "Update employee failed: $_"
    }
}

# 11. Refresh Token Rotation
Write-Host "`nRefreshing Access Token..." -ForegroundColor Cyan
$refreshBody = @{ refreshToken = $adminRefreshToken } | ConvertTo-Json
try {
    $refreshRes = Invoke-RestMethod -Uri "$BaseUrl/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
    Print-Response "11. Token Refresh Success" $refreshRes
    $newAccessToken = $refreshRes.data.accessToken
    $newRefreshToken = $refreshRes.data.refreshToken
} catch {
    Write-Error "Token refresh failed: $_"
}

# 12. Logout
Write-Host "`nLogging out..." -ForegroundColor Cyan
$logoutHeaders = @{ Authorization = "Bearer $newAccessToken" }
try {
    $logoutRes = Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method Post -Headers $logoutHeaders
    Print-Response "12. Logout Success" $logoutRes
} catch {
    Write-Error "Logout failed: $_"
}

# 13. Access with logged-out token (Should fail with 401)
Write-Host "`nAccessing profile with logged-out token (Should fail)..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method Get -Headers $logoutHeaders
    Write-Error "Access with logged-out token succeeded!"
} catch {
    Write-Host "Correctly blocked: $_" -ForegroundColor Green
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response body: $($reader.ReadToEnd())" -ForegroundColor Green
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "BACKEND PHASE 1 TESTS COMPLETED!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
