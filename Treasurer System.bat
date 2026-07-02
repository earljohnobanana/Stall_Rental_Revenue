@echo off
title Stall Revenue Monitoring System
color 1F

echo.
echo  ============================================
echo   STALL REVENUE MONITORING SYSTEM
echo   Municipal Treasurer's Office
echo  ============================================
echo.

set ROOT=C:\stall-revenue-system

:: ── Check Node.js ─────────────────────────────────────────────
echo  Checking Node.js...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not installed!
    echo  Download from https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] Node.js found.

:: ── Check frontend build ──────────────────────────────────────
if not exist "%ROOT%\client\dist\" (
    echo  Building frontend - please wait...
    cd /d "%ROOT%\client"
    if not exist "node_modules\" call npm install
    call npm run build
    echo  [OK] Frontend built.
)
echo  [OK] Frontend ready.

:: ── Install server packages if needed ────────────────────────
cd /d "%ROOT%\server"
if not exist "node_modules\" (
    echo  Installing server packages...
    call npm install
)

:: ── Copy env file ─────────────────────────────────────────────
if exist ".env.local" copy /Y .env.local .env > nul 2>&1

:: ── Kill anything on port 5000 ────────────────────────────────
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a > nul 2>&1
)

:: ── Start backend ─────────────────────────────────────────────
echo.
echo  Starting server...
start "SRMS Backend" /min cmd /c "cd /d "%ROOT%\server" && node app.js & pause"

:: ── Wait then open browser ────────────────────────────────────
echo  Waiting for server to start...
timeout /t 5 /nobreak > nul

echo  Opening browser...
start "" "http://localhost:5000"

echo.
echo  ============================================
echo   SRMS is running at http://localhost:5000
echo   Login with: ADMIN-001
echo.
echo   NOTE: Make sure XAMPP MySQL is running!
echo   If login fails - open XAMPP and start MySQL
echo.
echo   Press any key to STOP the server.
echo  ============================================
echo.
pause > nul

:: ── Stop ──────────────────────────────────────────────────────
taskkill /f /fi "WINDOWTITLE eq SRMS Backend" > nul 2>&1
taskkill /f /im node.exe > nul 2>&1
echo  Server stopped.
timeout /t 2 /nobreak > nul