@echo off
title WhatsApp Commerce Hub - Starting...

echo ==========================================
echo   WhatsApp Commerce Hub - Start Script
echo ==========================================
echo.

REM Check if the app is already running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo WARNING: Node.js processes are already running
    echo.
)

echo Starting WhatsApp Commerce Hub...
echo This may take a few moments...
echo.

REM Navigate to the app directory and start the development server
cd /d "%~dp0app"
start "WhatsApp Commerce Hub Server" cmd /k "yarn dev:no-reload"

echo.
echo ==========================================
echo   Server starting...
echo   Local URL: http://localhost:3001
echo   Webhook URL: https://nonheroic-unvigorously-thurman.ngrok-free.dev/api/webhook/shopify
echo ==========================================
echo.
echo The server will continue running in the background.
echo To stop the server, run stop-project.bat
echo.
echo Press any key to exit this window...
pause >nul