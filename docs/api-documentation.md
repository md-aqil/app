# WhatsApp Commerce Hub - API Documentation

## Overview

The WhatsApp Commerce Hub provides a complete solution for integrating WhatsApp checkout with Shopify stores. This documentation covers the API endpoints, webhooks, and integration patterns.

## Base URL

```
https://your-domain.com/api
```

## Authentication

All API requests require proper authentication through the integrations system. Configure your WhatsApp Business and Shopify credentials through the dashboard.

## Webhook Endpoints

### WhatsApp Webhook

**Endpoint**: `/webhook/whatsapp`
**Method**: `GET`, `POST`
**Description**: Handles incoming WhatsApp messages and verifies webhook subscriptions

#### GET Request (Verification)
Query Parameters:
- `hub.mode` (string): Must be "subscribe"
- `hub.verify_token` (string): Verification token configured in settings
- `hub.challenge` (string): Challenge string to echo back

#### POST Request (Message Processing)
Body: WhatsApp webhook payload containing message data

### Shopify Webhook

**Endpoint**: `/webhook/shopify`
**Method**: `POST`
**Description**: Handles Shopify order events and customer updates

Headers:
- `X-Shopify-Topic` (string): Event topic (e.g., "orders/create")
- `X-Shopify-Webhook-Id` (string): Unique webhook identifier

Body: Shopify webhook payload containing event data

## API Endpoints

### Integrations

#### Get Integrations
**Endpoint**: `/integrations`
**Method**: `GET`
**Description**: Retrieve current integration status

Response:
```json
{
  "whatsapp": {
    "connected": true,
    "data": {
      "phoneNumberId": "1234567890",
      "businessAccountId": "0987654321",
      "webhookVerifyToken": "whatsapp_verify_token_123"
    }
  },
  "shopify": {
    "connected": true,
    "data": {
      "shopDomain": "your-store.myshopify.com",
      "apiKey": "shpat_xxxxxxxxxxxxxxxx",
      "webhookVerifyToken": "shopify_webhook_verify_token"
    }
  },
  "stripe": {
    "connected": false,
    "data": {
      "publishableKey": ""
    }
  }
}
```

#### Save Integration
**Endpoint**: `/integrations`
**Method**: `POST`
**Description**: Save integration configuration

Body:
```json
{
  "type": "whatsapp",
  "data": {
    "phoneNumberId": "1234567890",
    "accessToken": "your_access_token",
    "businessAccountId": "0987654321"
  }
}
```

### Messages

#### Get Messages
**Endpoint**: `/messages`
**Method**: `GET`
**Description**: Retrieve all messages

Response:
```json
[
  {
    "id": "uuid",
    "userId": "default",
    "recipient": "+1234567890",
    "phone": "+1234567890",
    "message": "Hello world",
    "isCustomer": false,
    "timestamp": "2023-01-01T00:00:00.000Z",
    "whatsappMessageId": "wamid.xxxxxxxxxxxxxxxx",
    "status": "sent"
  }
]
```

#### Send Message
**Endpoint**: `/messages`
**Method**: `POST`
**Description**: Send a WhatsApp message

Body:
```json
{
  "to": "+1234567890",
  "message": "Hello world"
}
```

### Chats

#### Get Chats
**Endpoint**: `/chats`
**Method**: `GET`
**Description**: Retrieve all chats

Response:
```json
[
  {
    "id": "uuid",
    "userId": "default",
    "phone": "+1234567890",
    "name": "Customer +1234567890",
    "lastMessage": "Hello",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "unread": 0,
    "avatar": "https://ui-avatars.com/api/?name=Customer&background=random"
  }
]
```

#### Get Chat Messages
**Endpoint**: `/chats/{phone}/messages`
**Method**: `GET`
**Description**: Retrieve messages for a specific chat

#### Send Chat Message
**Endpoint**: `/chats`
**Method**: `POST`
**Description**: Send a message to a specific chat

Body:
```json
{
  "phone": "+1234567890",
  "message": "Hello world"
}
```

### Orders

#### Get Orders
**Endpoint**: `/orders`
**Method**: `GET`
**Description**: Retrieve all orders

Response:
```json
[
  {
    "id": "shopify-1234567890",
    "userId": "default",
    "shopifyOrderId": "1234567890",
    "orderNumber": 1001,
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+1234567890",
    "total": "29.99",
    "currency": "USD",
    "status": "paid",
    "lineItems": [],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### Sync Order
**Endpoint**: `/orders`
**Method**: `POST`
**Description**: Sync a Shopify order

Body:
```json
{
  "shopifyOrderId": "1234567890"
}
```

### Products

#### Get Products
**Endpoint**: `/products`
**Method**: `GET`
**Description**: Retrieve all products

Response:
```json
[
  {
    "id": "1234567890",
    "userId": "default",
    "title": "Test Product",
    "description": "Test product description",
    "price": "29.99",
    "image": "https://example.com/image.jpg",
    "handle": "test-product"
  }
]
```

#### Sync Product
**Endpoint**: `/products`
**Method**: `POST`
**Description**: Sync a Shopify product

Body:
```json
{
  "shopifyProductId": "1234567890"
}
```

### Draft Orders

#### Create Draft Order
**Endpoint**: `/draft-orders`
**Method**: `POST`
**Description**: Create a Shopify draft order

Body:
```json
{
  "shopifyOrderId": "1234567890"
}
```

### Campaigns

#### Get Campaigns
**Endpoint**: `/campaigns`
**Method**: `GET`
**Description**: Retrieve all campaigns

Response:
```json
[
  {
    "id": "uuid",
    "userId": "default",
    "message": "Special offer for you!",
    "audience": "all_customers",
    "recipients": [],
    "sentAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### Send Campaign
**Endpoint**: `/campaigns`
**Method**: `POST`
**Description**: Send a campaign message

Body:
```json
{
  "message": "Special offer for you!",
  "audience": "all_customers"
}
```

### Payments

#### Create Stripe Checkout Session
**Endpoint**: `/stripe/checkout-session`
**Method**: `POST`
**Description**: Create a Stripe checkout session

Body:
```json
{
  "lineItems": [
    {
      "price": "price_123",
      "quantity": 1
    }
  ],
  "metadata": {
    "orderId": "test_order_123"
  }
}
```

### WhatsApp Checkout

#### Initiate WhatsApp Checkout
**Endpoint**: `/whatsapp-checkout`
**Method**: `POST`
**Description**: Start a WhatsApp checkout process

Body:
```json
{
  "customerPhone": "+1234567890",
  "cartItems": [
    {
      "title": "Test Product",
      "price": "29.99",
      "quantity": 1,
      "variant_id": "1234567890",
      "grams": 200
    }
  ],
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "address1": "123 Test Street",
    "city": "Test City",
    "province": "Test State",
    "country": "Test Country",
    "zip": "12345"
  }
}
```

## Webhook Events

### WhatsApp Webhook Events

The WhatsApp webhook handles incoming messages and manages the conversation flow:

1. **Message Received**: Processes text, image, document, and other message types
2. **Message Status Updates**: Tracks message delivery and read status
3. **Conversation Flow**: Manages multi-step checkout process

### Shopify Webhook Events

The Shopify webhook processes various order and customer events:

1. **orders/create**: New order created
2. **orders/updated**: Order information updated
3. **orders/paid**: Order payment received
4. **orders/fulfilled**: Order fulfilled/shipped
5. **orders/cancelled**: Order cancelled
6. **customers/create**: New customer created
7. **customers/update**: Customer information updated

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request - Invalid parameters or data
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Unexpected server error
- `502`: Bad Gateway - External service error (e.g., Shopify API)

Error responses follow this format:
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **WhatsApp API**: Follows Facebook's rate limits
- **Shopify API**: Follows Shopify's rate limits
- **General API**: 1000 requests per hour per IP

## Environment Variables

Required environment variables:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=WhatsApp_api
NEXT_PUBLIC_BASE_URL=https://your-domain.com
PORT=3001
SESSION_TIMEOUT=900000
LOG_LEVEL=info
```

WhatsApp-specific:
```
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=whatsapp_verify_token_123
```

Shopify-specific:
```
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_WEBHOOK_VERIFY_TOKEN=shopify_webhook_verify_token
```

Payment-specific:
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```