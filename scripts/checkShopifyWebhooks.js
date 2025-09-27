// Script to check Shopify webhooks configuration
// Usage: node scripts/checkShopifyWebhooks.js

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
    
    console.log(`Found ${webhooks.length} webhooks:`);
    webhooks.forEach(webhook => {
      console.log(`- ID: ${webhook.id}`);
      console.log(`  Topic: ${webhook.topic}`);
      console.log(`  Address: ${webhook.address}`);
      console.log(`  Format: ${webhook.format}`);
      console.log(`  Created: ${webhook.created_at}`);
      console.log('');
    });
    
    // Check if we have the required webhooks for order status automation
    const requiredTopics = [
      'orders/create',
      'orders/updated',
      'orders/paid',
      'orders/fulfilled',
      'orders/cancelled'
    ];
    
    console.log('Checking for required webhooks:');
    requiredTopics.forEach(topic => {
      const foundWebhook = webhooks.find(w => w.topic === topic);
      if (foundWebhook) {
        console.log(`✓ ${topic} - Found (ID: ${foundWebhook.id})`);
      } else {
        console.log(`✗ ${topic} - Missing`);
      }
    });
    
    await client.close();
    console.log('\nWebhook check completed!');
  } catch (error) {
    console.error('Error checking Shopify webhooks:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}