# Start and Stop Guide

This guide explains how to start and stop your WhatsApp Commerce Hub application.

## Starting the Application

### Option 1: Using the Batch File (Recommended for Windows)
Double-click on `start.bat` in the project root directory. This will:
1. Check for required dependencies
2. Start the Next.js development server in a new window
3. Start the Cloudflare tunnel in a new window
4. Display important information about your application URLs

### Option 2: Using the PowerShell Script
Double-click on `start.ps1` in the project root directory. This will:
1. Check for required dependencies
2. Start the Next.js development server in a new PowerShell window
3. Start the Cloudflare tunnel in a new PowerShell window
4. Display important information about your application URLs

### Option 3: Manual Start
Open a terminal and run:
```bash
npm run dev
```

In a separate terminal, run:
```bash
cloudflared tunnel --no-autoupdate run myapp
```

## Stopping the Application

### Option 1: Using the Batch File (Recommended)
Double-click on `stop.bat` in the project root directory. This will:
1. Terminate all Node.js processes
2. Terminate all Cloudflared processes
3. Kill any remaining processes on port 3001

### Option 2: Manual Stop
1. Close the terminal windows where the processes are running
2. Or press `Ctrl+C` in each terminal window
3. Or use Task Manager to end the Node.js and Cloudflared processes

## Accessing Your Application

Once started, your application will be available at:
- Local development: http://localhost:3001
- Public access: https://lcsw.dpdns.org

### Webhook URLs
- Shopify: https://lcsw.dpdns.org/api/webhook/shopify
- WhatsApp: https://lcsw.dpdns.org/api/webhook/whatsapp

## Troubleshooting

### If the application fails to start:
1. Make sure Node.js and cloudflared are installed
2. Check that port 3001 is not being used by another application
3. Run `stop.bat` to ensure no conflicting processes are running

### If you see connection errors:
1. Verify your internet connection
2. Check that your Cloudflare tunnel is properly configured
3. Ensure your custom domain DNS settings are correct

### If processes don't stop:
1. Use the `stop.bat` script
2. Manually terminate processes through Task Manager
3. Restart your computer if necessary