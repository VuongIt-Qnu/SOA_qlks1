@echo off
REM Script to check health of all services (Windows)

echo ============================================================
echo SOA Hotel Management System - Service Health Check
echo ============================================================
echo.

REM Check services
echo Checking Services...
echo ------------------------------------------------------------

curl -s http://localhost:8001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Auth Service - Running
) else (
    echo [FAIL] Auth Service - Not Running
)

curl -s http://localhost:8002/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Customer Service - Running
) else (
    echo [FAIL] Customer Service - Not Running
)

curl -s http://localhost:8003/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Room Service - Running
) else (
    echo [FAIL] Room Service - Not Running
)

curl -s http://localhost:8004/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Booking Service - Running
) else (
    echo [FAIL] Booking Service - Not Running
)

curl -s http://localhost:8005/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Payment Service - Running
) else (
    echo [FAIL] Payment Service - Not Running
)

curl -s http://localhost:8006/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Report Service - Running
) else (
    echo [FAIL] Report Service - Not Running
)

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend - Running
) else (
    echo [FAIL] Frontend - Not Running
)

echo.
echo ============================================================
echo Note: Install curl if not available, or use PowerShell script
echo ============================================================
pause

