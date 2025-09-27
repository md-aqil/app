# WhatsApp Commerce Hub - Project Comprehensive Guide

This guide provides a comprehensive overview of the WhatsApp Commerce Hub project, including setup instructions, feature descriptions, and best practices.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Integrations](#integrations)
7. [Motion Primitives Integration](#motion-primitives-integration)
8. [API Endpoints](#api-endpoints)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## Project Overview

The WhatsApp Commerce Hub is a comprehensive solution for integrating WhatsApp with your Shopify store, enabling conversational commerce and streamlined customer interactions.

### Key Features
- **WhatsApp Messaging Integration**: Send and receive messages directly from your dashboard
- **Shopify Product Sync**: Automatically sync your Shopify products
- **Order Management**: View and manage Shopify orders with WhatsApp notifications
- **Campaign Management**: Create and send marketing campaigns to your customers
- **WhatsApp Checkout**: Allow customers to complete purchases via WhatsApp
- **Catalog Sending**: Share product catalogs with customers via WhatsApp

## Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Node.js
- **Database**: MongoDB
- **UI Components**: Radix UI, Shadcn UI
- **APIs**: WhatsApp Business API, Shopify Admin API
- **Payment Processing**: Stripe, Razorpay
- **Tunneling**: Cloudflare Tunnel
- **Testing**: Jest

## Prerequisites

Before setting up the WhatsApp Commerce Hub, ensure you have:

1. Node.js (version 14 or higher)
2. MongoDB database
3. WhatsApp Business API access
4. Shopify store with Admin API access
5. Stripe account (optional)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd whatsapp-commerce-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Cloudflare Tunnel (required for webhook functionality):
   ```bash
   npm install -g cloudflared
   ```

## Configuration

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```env
MONGO_URL=mongodb://localhost:27017/whatsapp-commerce
DB_NAME=whatsapp-commerce
NEXT_PUBLIC_BASE_URL=http://localhost:3001
CORS_ORIGINS=*
```

### Application Access
- Dashboard: `http://localhost:3001/dashboard`
- API endpoints: `http://localhost:3001/api/[endpoint]`

### Starting the Application
```bash
npm run dev:tunnel
```

This command uses `concurrently` to run both the Next.js development server (on port 3001) and Cloudflare Tunnel simultaneously.

## Integrations

### WhatsApp Integration
1. Navigate to Settings > Integrations
2. Enter WhatsApp credentials:
   - Phone Number ID
   - Access Token
   - Business Account ID
3. Click "Connect WhatsApp"

### Shopify Integration
1. Create a Shopify Private App with required permissions:
   - `read_products`
   - `write_draft_orders`
   - `write_orders`
2. In the application settings, enter:
   - Shop Domain (e.g., your-store.myshopify.com)
   - Access Token (Private App Password)
3. Click "Connect Shopify"

### Stripe Integration (Optional)
1. Navigate to Settings > Integrations
2. Enter Stripe credentials:
   - Publishable Key
   - Secret Key
3. Click "Connect Stripe"

## Motion Primitives Integration

### Components

#### TextEffectWrapper
A simplified wrapper for the TextEffect component with Tailwind CSS support.

**Props:**
- `text` (string): The text to animate
- `className` (string): Additional Tailwind classes
- `preset` ("blur" | "fade-in-blur" | "scale" | "fade" | "slide"): Animation preset
- `per` ("char" | "word" | "line"): How to segment the text
- `delay` (number): Delay before animation starts

**Usage:**
```jsx
import { TextEffectWrapper } from "@/components/TextEffectWrapper";

<TextEffectWrapper 
  text="Welcome to our store" 
  className="text-2xl font-bold text-blue-600"
  preset="fade"
  per="word"
/>
```

#### TextEffect
The core TextEffect component with full customization options.

**Usage:**
```jsx
import { TextEffect } from "@/components/motion-primitives/text-effect";

<TextEffect per="word" preset="fade">
  Welcome to our store
</TextEffect>
```

### Animation Presets
1. **fade**: Elements fade in
2. **slide**: Elements slide in from below
3. **scale**: Elements scale up from 0
4. **blur**: Elements blur in while becoming visible
5. **fade-in-blur**: Elements fade and blur in while moving up

### Segmentation Options
1. **char**: Each character is animated individually
2. **word**: Each word is animated individually
3. **line**: Each line is animated individually

### Utility Functions

#### cn()
Utility function for merging Tailwind CSS classes.

**Usage:**
```jsx
import { cn } from "@/lib/utils";

const className = cn("text-blue-500", "font-bold", conditionalClass && "underline");
```

## API Endpoints

### Integrations
- `GET /api/integrations`: Get all integration statuses
- `POST /api/integrations`: Save integration settings

### Messages
- `GET /api/messages`: Get all messages
- `POST /api/messages`: Send a WhatsApp message

### Chats
- `GET /api/chats`: Get all chats
- `POST /api/chats`: Create a new chat

### Orders
- `GET /api/orders`: Get all orders
- `POST /api/orders`: Fetch a specific Shopify order

### Products
- `GET /api/products`: Get all products (with database caching)
- `POST /api/products`: Fetch a specific Shopify product

### Campaigns
- `GET /api/campaigns`: Get all campaigns
- `POST /api/campaigns`: Create and send a campaign

### Webhooks
- `POST /api/webhook/shopify`: Shopify webhook endpoint

## Testing

### Quick Testing
Run all tests at once:
```bash
node run-all-tests.js
```

Or use the batch file on Windows:
```bash
run-all-tests.bat
```

### Manual Testing
1. Verify all integrations show as "Connected" in the dashboard
2. Test the WhatsApp checkout button on your Shopify cart page
3. Place a test order via WhatsApp checkout
4. Confirm a draft order is created in Shopify
5. Verify the payment link is delivered via WhatsApp

## Troubleshooting

### Common Issues

#### Integration Connection Failures
- Double-check all credentials
- Verify API permissions are correctly set
- Ensure the application can access external APIs

#### Webhook Issues
- Verify webhook URLs are publicly accessible via Cloudflare Tunnel
- Check webhook delivery logs in Shopify
- Ensure verify tokens match between systems

#### WhatsApp Checkout Problems
- Verify Shopify integration is connected
- Check browser console for JavaScript errors
- Ensure the checkout button script is properly implemented

### Debugging Tools
Several debugging scripts are included in the project:
- `check-integration-status.js`: View current integration status
- `verify-integration-loading.js`: See how data is loaded in the settings page
- `fix-database-structure.js`: Fix any database structure issues

## Best Practices

### Performance
- Use "word" segmentation instead of "char" for longer texts
- Limit the number of animated elements on a page
- Use delay props to stagger animations
- Consider using conditional rendering to only animate visible elements

### Security
- Never expose sensitive credentials in client-side code
- Use environment variables for API keys and tokens
- Implement proper error handling without exposing sensitive information