# Custom Domain Setup Guide

This guide explains how to configure your WhatsApp integration application to use a custom domain instead of the default ngrok URLs.

## Prerequisites

1. A domain name (e.g., `lcsw.dpdns.org`)
2. Cloudflare account with your domain configured
3. The application installed and running

## Setup Instructions

### Method 1: Using the Batch File (Windows)

1. Double-click on `set-custom-domain.bat` in the project root directory
2. The script will automatically update your environment configuration

### Method 2: Using Node.js Directly

Run the following command from the project root directory:

```bash
node setup-custom-domain.js lcsw.dpdns.org
```

Or to use a different domain:

```bash
node setup-custom-domain.js your-domain.com
```

### Method 3: Manual Configuration

1. Open the `.env` file in the project root
2. Change the `NEXT_PUBLIC_BASE_URL` value to your custom domain:
   ```
   NEXT_PUBLIC_BASE_URL=https://lcsw.dpdns.org
   ```

## Updating Webhook URLs

After setting up your custom domain, you'll need to update the webhook URLs in your external services:

### Shopify Configuration

1. Go to your Shopify Admin Dashboard
2. Navigate to Settings > Notifications > Webhooks
3. Update your webhooks to use the new URL:
   ```
   https://lcsw.dpdns.org/api/webhook/shopify
   ```

### WhatsApp Business Platform Configuration

1. Access your WhatsApp Business Platform settings
2. Update your webhook URL to:
   ```
   https://lcsw.dpdns.org/api/webhook/whatsapp
   ```

## Verification

To verify that your custom domain is properly configured:

1. Check the `.env` file to ensure `NEXT_PUBLIC_BASE_URL` shows your custom domain
2. Restart your application
3. Test the webhook endpoints to ensure they're accessible

## Troubleshooting

If you encounter issues:

1. Ensure your domain is properly configured with Cloudflare
2. Check that your DNS records are correctly set up
3. Verify that Cloudflare proxying is enabled for your domain
4. Make sure your firewall allows incoming connections on the required ports

## Reverting to Default (ngrok)

If you need to revert to the default ngrok configuration:

```bash
node update-env.js
```

This will generate a new ngrok URL and update your configuration accordingly.