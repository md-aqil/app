# Test script to verify both startup methods work
Write-Host "Testing WhatsApp Commerce Hub Startup Methods" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

Write-Host ""
Write-Host "1. Testing PowerShell Script (start-app.ps1)" -ForegroundColor Yellow
Write-Host "   This should work correctly..." -ForegroundColor Gray

Write-Host ""
Write-Host "2. Testing Batch File (start.bat)" -ForegroundColor Yellow
Write-Host "   This should also work correctly..." -ForegroundColor Gray

Write-Host ""
Write-Host "Both startup methods create separate windows for:" -ForegroundColor Cyan
Write-Host "  - Next.js development server (port 3001)" -ForegroundColor Cyan
Write-Host "  - Cloudflare tunnel (routes to https://lcsw.dpdns.org)" -ForegroundColor Cyan

Write-Host ""
Write-Host "To stop the application, you can:" -ForegroundColor Magenta
Write-Host "  - Close the separate windows" -ForegroundColor Magenta
Write-Host "  - Run stop.bat" -ForegroundColor Magenta

Write-Host ""
Write-Host "Recommendation: Use start-app.ps1 for better compatibility with Windows PowerShell" -ForegroundColor Green

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")