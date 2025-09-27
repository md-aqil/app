# Project Start Options

This document explains the different ways to start your WhatsApp Commerce Hub project with Cloudflare Tunnel integration.

## Quick Start (Recommended)

For the best experience on Windows, use the PowerShell script:

**Start with Custom Domain (Recommended):**
```bash
.\start-app.ps1
```

This method provides better error handling and compatibility with Windows PowerShell.

## Available Start Methods

### 1. Start with Dynamic Tunnel URL (Default)
This method creates a new tunnel with a random subdomain each time (similar to ngrok).

**Using PowerShell Script (Recommended):**
```bash
.\start-app.ps1
```

**Using Batch File:**
```bash
start.bat
```

**Using npm Script:**
```bash
npm run dev:tunnel
```

**What it does:**
- Starts your Next.js application on port 3001
- Creates a new Cloudflare tunnel
- Provides a random subdomain URL (e.g., `https://random-subdomain.trycloudflare.com`)

### 2. Start with Custom Domain (Recommended)
This method uses your predefined tunnel that routes to your custom domain [lcsw.dpdns.org](https://lcsw.dpdns.org/).

**Using PowerShell Script (Recommended):**
```bash
.\start-app.ps1
```

**Using Batch File:**
```bash
start.bat
```

**Using npm Script:**
```bash
npm run dev:custom
```

**Using Node.js directly:**
```bash
node start-with-custom-domain.js
```

**What it does:**
- Starts your Next.js application on port 3001
- Uses your existing tunnel "myapp"
- Routes traffic through your custom domain [lcsw.dpdns.org](https://lcsw.dpdns.org/)

### 3. Manual Start
Start components separately for more control.

**Start Next.js only:**
```bash
npm run dev
```

**Start Cloudflare tunnel separately:**
```bash
# For dynamic URL
cloudflared tunnel --url http://localhost:3001

# For custom domain
cloudflared tunnel --no-autoupdate run myapp
```

## Your Webhook URLs

Depending on your start method, your webhook URLs will be:

### With Custom Domain ([lcsw.dpdns.org](https://lcsw.dpdns.org/)):
- **Shopify**: `https://lcsw.dpdns.org/api/webhook/shopify`
- **WhatsApp**: `https://lcsw.dpdns.org/api/webhook/whatsapp`

### With Dynamic Tunnel (random subdomain):
- **Shopify**: `https://[random-subdomain].trycloudflare.com/api/webhook/shopify`
- **WhatsApp**: `https://[random-subdomain].trycloudflare.com/api/webhook/whatsapp`

## Stopping the Project

### Using Batch File:
```bash
stop.bat
```

### Using Keyboard Shortcut:
Press `CTRL+C` in the terminal where the processes are running

### Manual Stop:
```bash
taskkill /f /im node.exe
taskkill /f /im cloudflared.exe
```

### Closing PowerShell Windows:
If you used the PowerShell script, you can simply close the separate PowerShell windows that were opened for the Next.js server and Cloudflare tunnel.

## Recommendations

### For Development:
Use the PowerShell script `start-app.ps1` for the best experience on Windows systems.

### For Production/Testing with External Services:
Use `start-app.ps1` or `start.bat` to maintain your [lcsw.dpdns.org](https://lcsw.dpdns.org/) domain which is more stable for:
- Shopify webhook configurations
- WhatsApp Business Platform settings
- Any external service integrations

## Troubleshooting

### If cloudflared is not found:
```bash
npm install -g cloudflared
```

### If the tunnel fails to start:
1. Check that your local app is running on port 3001
2. Verify your Cloudflare configuration files in `~/.cloudflared/`
3. Ensure you're logged in to Cloudflare: `cloudflared login`

### If processes don't stop:
Use the [stop.bat](file:///c:/xampp/htdocs/whats-app/stop.bat) script or manually terminate processes through Task Manager.

### If the batch file doesn't work properly:
Try using the PowerShell script `start-app.ps1` instead, which provides better compatibility with modern Windows systems.

## Making It Permanent

To make the custom domain tunnel run permanently in the background:

1. Start it with:
   ```bash
   cloudflared tunnel --no-autoupdate run myapp
   ```

2. Minimize the terminal window (don't close it)

3. Start your Next.js app separately:
   ```bash
   npm run dev
   ```

This way, your tunnel will keep running even if you restart your Next.js server.