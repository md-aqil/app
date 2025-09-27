// Script to test the Shopify Order Status Automation fix
// Usage: node scripts/testOrderAutomation.js <shopifyOrderId>

const { MongoClient } = require('mongodb');
const { triggerShopifyOrderStatusAutomation } = require('../lib/shopifyOrderAutomationTrigger');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node scripts/testOrderAutomation.js <shopifyOrderId>');
    console.log('Example: node scripts/testOrderAutomation.js 6986088743062');
    process.exit(1);
  }
  
  const shopifyOrderId = args[0];
  const customerPhone = '+1234567890'; // Test phone number
  
  console.log(`Testing Shopify Order Status Automation for order ${shopifyOrderId}...`);
  
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
    
    // Test the automation trigger
    console.log('Triggering Shopify Order Status Automation...');
    const result = await triggerShopifyOrderStatusAutomation(db, integrations, shopifyOrderId, customerPhone);
    
    console.log('Automation triggered successfully:');
    console.log(JSON.stringify(result, null, 2));
    
    await client.close();
    console.log('Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error testing automation:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}