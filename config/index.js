// Environment configuration
const config = {
  // MongoDB configuration
  mongodb: {
    url: process.env.MONGO_URL || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME || 'WhatsApp_api'
  },
  
  // WhatsApp configuration
  whatsapp: {
    apiVersion: 'v22.0',
    baseUrl: 'https://graph.facebook.com',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'whatsapp_verify_token_123'
  },
  
  // Shopify configuration
  shopify: {
    apiVersion: '2023-10',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
    webhookVerifyToken: process.env.SHOPIFY_WEBHOOK_VERIFY_TOKEN || 'shopify_webhook_verify_token'
  },
  
  // Payment configuration
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    }
  },
  
  // Application configuration
  app: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://lcsw.dpdns.org',
    port: process.env.PORT || 3001,
    sessionTimeout: process.env.SESSION_TIMEOUT || 15 * 60 * 1000 // 15 minutes in milliseconds
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  },
  
  // CORS configuration - Updated to allow Shopify domains
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
      '*', // Allow all origins by default
      'https://*.myshopify.com', // Shopify stores
      'https://*.shopify.com', // Shopify domains
      'https://suvanya.com', // Specific Shopify store domain
      'http://localhost:3000', // Local development
      'http://localhost:3001' // Local development
    ]
  }
};

module.exports = config;