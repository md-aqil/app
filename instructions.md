# WhatsApp Commerce Hub - Setup and Usage Instructions

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [WhatsApp Integration](#whatsapp-integration)
5. [Shopify Integration](#shopify-integration)
6. [Stripe Integration](#stripe-integration)
7. [Webhook Setup](#webhook-setup)
8. [WhatsApp Checkout Feature](#whatsapp-checkout-feature)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the WhatsApp Commerce Hub, ensure you have:

1. Node.js (version 14 or higher)
2. MongoDB database
3. WhatsApp Business API access
4. Shopify store with Admin API access
5. Stripe account (optional)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd whatsapp-commerce-hub
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Install Cloudflare Tunnel (required for webhook functionality):
   ```
   npm install -g cloudflared
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```
   MONGO_URL=mongodb://localhost:27017/whatsapp-commerce
   DB_NAME=whatsapp-commerce
   NEXT_PUBLIC_BASE_URL=http://localhost:3001
   CORS_ORIGINS=*
   ```

## Configuration

1. Start the development server with Cloudflare Tunnel:
   ```
   npm run dev:tunnel
   ```

2. Access the dashboard at `http://localhost:3001`

## WhatsApp Integration

To connect your WhatsApp Business account:

1. Navigate to the Settings page
2. In the WhatsApp Business section, enter:
   - Phone Number ID
   - Access Token
   - Business Account ID
3. Click "Connect WhatsApp"

## Shopify Integration

To connect your Shopify store:

1. Navigate to the Settings page
2. In the Shopify section, enter:
   - Shop Domain (e.g., your-store.myshopify.com)
   - Access Token (Private App Password - NOT the API Key/Secret)
3. Click "Connect Shopify"

**Important**: For the WhatsApp checkout feature to work, your Shopify access token must have the following permissions:
- `read_products`
- `write_draft_orders`
- `write_orders`

To add these permissions:
1. Go to your Shopify Admin Dashboard
2. Navigate to Apps > Manage private apps (or Develop apps)
3. Create a new private app or edit an existing one
4. In the Admin API Integration section, click "Configure"
5. Select the required scopes
6. Click "Save" and copy the Access token (Private App Password)

**Note**: You do NOT need the API Key and API Secret for this integration.

## Stripe Integration

To connect your Stripe account:

1. Navigate to the Settings page
2. In the Stripe section, enter:
   - Publishable Key
   - Secret Key
3. Click "Connect Stripe"

## Webhook Setup

After connecting your Shopify store, webhooks are automatically set up. The system will create the following webhooks in your Shopify store:
- `orders/create` - For new order notifications
- `orders/updated` - For order status updates
- `orders/paid` - For payment confirmation
- `orders/fulfilled` - For fulfillment notifications
- `orders/cancelled` - For cancellation notifications
- `customers/create` - For new customer tracking
- `customers/update` - For customer information updates

## WhatsApp Checkout Feature

The WhatsApp checkout feature allows customers to complete their purchases via WhatsApp instead of the standard Shopify checkout flow.

### Implementation

1. Add the WhatsApp checkout button to your Shopify store by adding the JavaScript code from the Shopify Documentation tab in the Settings page to your Shopify theme's `theme.liquid` file.

2. The button will appear on your cart page, allowing customers to checkout via WhatsApp.

## Testing

### Quick Test Steps

1. Verify all integrations show as "Connected" in the dashboard
2. Test the WhatsApp checkout button on your Shopify cart page
3. Place a test order via WhatsApp checkout
4. Confirm a draft order is created in Shopify
5. Verify the payment link is delivered via WhatsApp
6. Test order status updates through webhooks

### Detailed Testing Flow

1. **WhatsApp Integration Test**
   - Send a test message from the chat interface
   - Verify messages are sent and received correctly

2. **Shopify Integration Test**
   - Load products from Shopify
   - Verify product information is displayed correctly
   - Test order synchronization

3. **Webhook Test**
   - Create a test order in Shopify
   - Verify the order appears in the dashboard
   - Check that order status updates are reflected

4. **WhatsApp Checkout Test**
   - Add items to cart on Shopify
   - Click "Checkout via WhatsApp"
   - Complete the checkout flow
   - Verify draft order creation in Shopify

## Troubleshooting

### Common Issues

1. **Integration Connection Failures**
   - Double-check all credentials
   - Verify API permissions are correctly set
   - Ensure the application can access external APIs

2. **Webhook Issues**
   - Verify webhook URLs are publicly accessible via Cloudflare Tunnel
   - Check webhook delivery logs in Shopify
   - Ensure verify tokens match between systems

3. **WhatsApp Checkout Problems**
   - Verify Shopify integration is connected
   - Check browser console for JavaScript errors
   - Ensure the checkout button script is properly implemented

### Debugging Tools

Several debugging scripts are included in the project:

- `check-integration-status.js` - View current integration status
- `verify-integration-loading.js` - See how data is loaded in the settings page
- `fix-database-structure.js` - Fix any database structure issues
- `set-shopify-credentials.js` - Set Shopify credentials in the database

Run these scripts from the project root:
```bash
node check-integration-status.js
```

### Need Help?

If you continue to experience issues:

1. Check the detailed logs in the console
2. Verify all environment variables are set correctly
3. Ensure your MongoDB database is accessible
4. Confirm all API credentials are valid and have proper permissions