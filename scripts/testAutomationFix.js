// Test script to verify the Shopify Order Status Automation fix
// Usage: node scripts/testAutomationFix.js <shopifyOrderId> <customerPhone>

const { MongoClient } = require('mongodb');
const { triggerShopifyOrderStatusAutomation } = require('../lib/shopifyOrderAutomationTrigger');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node testAutomationFix.js <shopifyOrderId> <customerPhone>');
    console.log('Example: node testAutomationFix.js 1234567890 +1234567890');
    process.exit(1);
  }
  
  const shopifyOrderId = args[0];
  const customerPhone = args[1];
  
  console.log(`Testing Shopify Order Status Automation fix for order ${shopifyOrderId}...`);
  
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
    const result = await triggerShopifyOrderStatusAutomation(db, integrations, shopifyOrderId, customerPhone);
    
    console.log('Automation test completed successfully:');
    console.log(JSON.stringify(result, null, 2));
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('Error testing automation fix:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}