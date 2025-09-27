@echo off
title WhatsApp Commerce Hub

echo ==========================================
echo WhatsApp Commerce Hub - Starting Application
echo ==========================================

echo.
echo Checking for required dependencies...

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

:: Check if cloudflared is installed
cloudflared --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Cloudflared is not installed or not in PATH
    echo Installing cloudflared...
    npm install -g cloudflared
    if %errorlevel% neq 0 (
        echo Failed to install cloudflared
        pause
        exit /b 1
    )
    echo Cloudflared installed successfully
)

echo.
echo All dependencies found.

:: Check if port 3001 is already in use
netstat -ano | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo Warning: Port 3001 appears to be in use
    echo This may cause issues with the application
    echo.
)

echo.
echo Starting WhatsApp Commerce Hub with Custom Domain...
echo This will start both the Next.js server (port 3001) and Cloudflare tunnel
echo Using custom domain: https://lcsw.dpdns.org
echo.
echo To stop the application, run stop.bat or press Ctrl+C
echo.

:: Start the Next.js development server using the dev script from package.json
echo Starting Next.js development server...
cd /d C:\xampp\htdocs\whats-app
start "Next.js Server" cmd /k "npm run dev"

:: Wait a few seconds for the server to start
timeout /t 5 /nobreak >nul

:: Start the Cloudflare tunnel
echo Starting Cloudflare tunnel...
start "Cloudflare Tunnel" cmd /k "cd /d C:\xampp\htdocs\whats-app && cloudflared tunnel --no-autoupdate run myapp"

echo.
echo Application startup process completed.
echo.
echo Next.js server should be running on http://localhost:3001
echo Cloudflare tunnel is routing traffic to https://lcsw.dpdns.org
echo.
echo Webhook URLs:
echo Shopify: https://lcsw.dpdns.org/api/webhook/shopify
echo WhatsApp: https://lcsw.dpdns.org/api/webhook/whatsapp
echo.

echo.
echo ==========================================
echo Startup process finished
echo ==========================================
echo.
echo The application is now starting in separate windows
echo Close those windows or run stop.bat to stop the application
echo.

:: Pause to keep the window open
echo Press any key to close this window...
pause >nul