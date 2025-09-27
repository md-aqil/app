// Script to check Shopify webhook delivery status
// Usage: node scripts/checkWebhookDelivery.js

const { MongoClient } = require('mongodb');
const ShopifyClient = require('../services/shopifyClient');

async function main() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'WhatsApp_api';
    
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    
    // Get integrations
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    
    if (!integrations) {
      throw new Error('No integrations found in database');
    }
    
    // Initialize Shopify client
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    // Get all webhooks
    console.log('Fetching Shopify webhooks...');
    const webhooks = await shopifyClient.getWebhooks();
    
    console.log(`Found ${webhooks.length} webhooks. Checking delivery status for recent webhooks...`);
    
    // Check delivery status for the most recent webhooks
    for (const webhook of webhooks.slice(0, 3)) {
      console.log(`\nWebhook ID: ${webhook.id}`);
      console.log(`Topic: ${webhook.topic}`);
      console.log(`Address: ${webhook.address}`);
      
      try {
        // Get delivery attempts for this webhook
        const deliveryAttempts = await shopifyClient.getWebhookDeliveryAttempts(webhook.id);
        
        console.log(`Delivery attempts: ${deliveryAttempts.length}`);
        
        if (deliveryAttempts.length > 0) {
          // Show the most recent delivery attempt
          const recentAttempt = deliveryAttempts[deliveryAttempts.length - 1];
          console.log(`Most recent attempt:`);
          console.log(`  Status: ${recentAttempt.response_status}`);
          console.log(`  Sent at: ${recentAttempt.sent_at}`);
          console.log(`  Response headers: ${JSON.stringify(recentAttempt.response_headers)}`);
          
          if (recentAttempt.error_message) {
            console.log(`  Error: ${recentAttempt.error_message}`);
          }
        } else {
          console.log(`No delivery attempts found`);
        }
      } catch (error) {
        console.log(`Error checking delivery attempts: ${error.message}`);
      }
    }
    
    await client.close();
    console.log('\nWebhook delivery check completed!');
  } catch (error) {
    console.error('Error checking webhook delivery:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}