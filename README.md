# WhatsApp Commerce Hub

A comprehensive solution for integrating WhatsApp with your Shopify store, enabling conversational commerce and streamlined customer interactions.

## Features

- **WhatsApp Messaging Integration**: Send and receive messages directly from your dashboard
- **Shopify Product Sync**: Automatically sync your Shopify products
- **Order Management**: View and manage Shopify orders with WhatsApp notifications
- **Campaign Management**: Create and send marketing campaigns to your customers
- **WhatsApp Checkout**: Allow customers to complete purchases via WhatsApp
- **Catalog Sending**: Share product catalogs with customers via WhatsApp

## WhatsApp Checkout Feature

The WhatsApp Checkout feature allows customers to complete their purchases via WhatsApp instead of the standard Shopify checkout flow. This provides a more conversational and personalized shopping experience.

### How It Works

1. Customer clicks the "Checkout via WhatsApp" button on the cart page
2. Customer is redirected to WhatsApp with a pre-filled message
3. Your WhatsApp bot collects delivery address information
4. The system creates a draft order in Shopify
5. An invoice is sent to the customer with a payment link
6. Customer completes payment via the link

### Important: WhatsApp Opt-in Requirement

Due to WhatsApp Business API policies, customers must first send a message to your WhatsApp Business number to opt-in before you can send them messages. This is a WhatsApp requirement to prevent spam and ensure users want to receive messages from businesses.

For more information, see [WHATSAPP_OPT_IN_GUIDE.md](./WHATSAPP_OPT_IN_GUIDE.md)

### Implementation

For store owners:
1. Add the JavaScript code from the Settings > Shopify Documentation tab to your Shopify theme
2. Connect your Shopify store in the integrations settings
3. Ensure your Shopify app has the required permissions (`write_draft_orders`)

For testing:
1. Go to Settings > Integrations
2. Find the "Test WhatsApp Checkout" card
3. Enter your WhatsApp number
4. **Important**: Send any message from your test phone to your WhatsApp Business number first
5. Click "Test WhatsApp Checkout"
6. You will be redirected to WhatsApp with a pre-filled message

## Enhanced WhatsApp + Shopify Automation

The WhatsApp Commerce Hub now includes enhanced automation that seamlessly integrates WhatsApp checkout with Shopify order status updates:

### How It Works

1. Customer completes WhatsApp checkout
2. System creates order in Shopify
3. **NEW**: Automatically triggers Shopify Order Status Automation
4. Customer receives order confirmation via WhatsApp
5. As order status changes in Shopify (paid, fulfilled, delivered), customer receives automatic updates via WhatsApp

### Benefits

- **Zero Manual Work**: No need to manually link WhatsApp orders to Shopify automation
- **Consistent Experience**: Customers receive the same notifications regardless of checkout method
- **Error Handling**: Automatic retry mechanisms and admin notifications for failures
- **Unified Tracking**: All orders tracked in a single database with source identification

For detailed implementation information, see [WHATSAPP_SHOPIFY_INTEGRATION_GUIDE.md](./WHATSAPP_SHOPIFY_INTEGRATION_GUIDE.md)

## Cloudflare Tunnel Setup

The WhatsApp Commerce Hub uses Cloudflare Tunnel for secure access to your local development environment. This replaces older solutions like ngrok.

### Starting with Cloudflare Tunnel

To start the application with Cloudflare Tunnel:

1. **Double-click method**: Simply double-click on `start.bat`
2. **Command line**: Run from the command prompt:
   ```
   start.bat
   ```
3. **PowerShell**: Run from PowerShell:
   ```
   .\start.ps1
   ```
4. **Alternative PowerShell Script**: Run the improved PowerShell script:
   ```
   .\start-app.ps1
   ```

### Stopping the Application

To stop the application:

1. **Double-click method**: Double-click on `stop.bat`
2. **Command line**: Run from the command prompt:
   ```
   stop.bat
   ```

### Cloudflare Error 1033 Troubleshooting

If you encounter Error 1033 with your Cloudflare Tunnel:

1. Ensure your application is running on port 3001 (not 3000)
2. Verify your Cloudflare configuration points to port 3001
3. Ensure no firewall is blocking the connection

## Testing Automation

The WhatsApp Commerce Hub includes comprehensive testing capabilities to ensure all automation features work correctly.

### Quick Testing

Run all tests at once:
```bash
npm test
```

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure your environment variables in `.env`
4. **Important**: Set up Cloudflare Tunnel for webhook functionality
5. Start the development server by double-clicking `start.bat`
6. Access the dashboard at `https://lcsw.dpdns.org` (or your custom domain)

## Requirements

- Node.js (version 14 or higher)
- MongoDB database
- WhatsApp Business API access
- Shopify store with Admin API access

## Documentation

For complete and up-to-date information about the project, see:
- [Comprehensive Project Guide](./COMPREHENSIVE_PROJECT_GUIDE.md) - Complete guide covering all aspects of the project

Additional documentation files:
- [Setup and Usage Instructions](./instructions.md)
- [WhatsApp Checkout Integration Guide](./WHATSAPP_CHECKOUT_INTEGRATION.md)
- [Shopify Integration Guide](./SHOPIFY_INTEGRATION_GUIDE.md)
- [WhatsApp Checkout Shopify Integration Guide](./WHATSAPP_CHECKOUT_SHOPIFY_INTEGRATION_GUIDE.md)
- [WhatsApp Catalog Integration Guide](./WHATSAPP_CATALOG_INTEGRATION_GUIDE.md)
- [WhatsApp + Shopify Integration Guide](./WHATSAPP_SHOPIFY_INTEGRATION_GUIDE.md)
- [Complete Testing Guide](./COMPLETE_TESTING_GUIDE.md)
- [Testing Checklist](./TESTING_CHECKLIST.md)

## Troubleshooting

### Cloudflare Tunnel Issues (Error 1033)

If you encounter Error 1033 with your Cloudflare Tunnel:

1. Ensure your application is running on port 3001 (not 3000)
2. Verify your Cloudflare configuration points to port 3001
3. Check that no firewall is blocking the connection

### Common Solutions

- Install cloudflared CLI: `npm install -g cloudflared`
- Authenticate: `cloudflared login`
- Run services separately in different terminals if needed

## Support

For issues with the WhatsApp Commerce Hub, please check the documentation files or create an issue in the repository.