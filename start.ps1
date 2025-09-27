# WhatsApp Commerce Hub - Start Script
Write-Host "==========================================" -ForegroundColor Green
Write-Host "WhatsApp Commerce Hub - Starting Application" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Checking for required dependencies..." -ForegroundColor Yellow

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js and try again" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if cloudflared is installed
try {
    $cloudflaredVersion = cloudflared --version
    Write-Host "Cloudflared found: $cloudflaredVersion" -ForegroundColor Green
} catch {
    Write-Host "Cloudflared not found. Installing..." -ForegroundColor Yellow
    try {
        npm install -g cloudflared
        Write-Host "Cloudflared installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install cloudflared" -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

Write-Host ""
Write-Host "All dependencies found." -ForegroundColor Green

# Check if port 3001 is already in use
$portInUse = netstat -ano | Select-String ":3001"
if ($portInUse) {
    Write-Host "Warning: Port 3001 appears to be in use" -ForegroundColor Yellow
    Write-Host "This may cause issues with the application" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Starting WhatsApp Commerce Hub with Custom Domain..." -ForegroundColor Yellow
Write-Host "This will start both the Next.js server (port 3001) and Cloudflare tunnel" -ForegroundColor Yellow
Write-Host "Using custom domain: https://lcsw.dpdns.org" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop the application, close the new PowerShell windows or run stop.bat" -ForegroundColor Cyan
Write-Host ""

# Start the Next.js development server in a new PowerShell window
Write-Host "Starting Next.js development server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

# Wait a few seconds for the server to start
Start-Sleep -Seconds 5

# Start the Cloudflare tunnel in a new PowerShell window
Write-Host "Starting Cloudflare tunnel..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel --no-autoupdate run myapp" -WindowStyle Normal

Write-Host ""
Write-Host "Application startup process completed." -ForegroundColor Green
Write-Host ""
Write-Host "Next.js server should be running on http://localhost:3001" -ForegroundColor Cyan
Write-Host "Cloudflare tunnel is routing traffic to https://lcsw.dpdns.org" -ForegroundColor Cyan
Write-Host ""
Write-Host "Webhook URLs:" -ForegroundColor Cyan
Write-Host "Shopify: https://lcsw.dpdns.org/api/webhook/shopify" -ForegroundColor Cyan
Write-Host "WhatsApp: https://lcsw.dpdns.org/api/webhook/whatsapp" -ForegroundColor Cyan
Write-Host ""

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Startup process finished" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The application is now starting in separate windows" -ForegroundColor Yellow
Write-Host "Close those windows or run stop.bat to stop the application" -ForegroundColor Yellow
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")