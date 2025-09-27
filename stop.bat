@echo off
title WhatsApp Commerce Hub - Stop

echo ==========================================
echo WhatsApp Commerce Hub - Stopping Application
echo ==========================================

echo.
echo Stopping Node.js and Cloudflared processes...

:: Kill Node.js processes
echo Stopping Node.js processes...
taskkill /f /im node.exe /t >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js processes terminated.
) else (
    echo No Node.js processes found.
)

:: Kill cloudflared processes
echo Stopping Cloudflared processes...
taskkill /f /im cloudflared.exe /t >nul 2>&1
if %errorlevel% equ 0 (
    echo Cloudflared processes terminated.
) else (
    echo No Cloudflared processes found.
)

:: Also try to kill any concurrently processes
echo Stopping concurrently processes...
taskkill /f /im concurrently.exe /t >nul 2>&1
if %errorlevel% equ 0 (
    echo Concurrently processes terminated.
) else (
    echo No Concurrently processes found.
)

echo.
echo Checking for remaining processes on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing process %%a on port 3001...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo Application stopped.
echo.
pause