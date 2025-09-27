// Script to manually trigger Shopify Order Status Automation for testing
// Usage: node scripts/triggerShopifyAutomation.js <shopifyOrderId> <customerPhone>

const { MongoClient } = require('mongodb');
const { triggerShopifyOrderStatusAutomation } = require('../lib/shopifyOrderAutomationTrigger');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node triggerShopifyAutomation.js <shopifyOrderId> <customerPhone>');
    console.log('Example: node triggerShopifyAutomation.js 1234567890 +1234567890');
    process.exit(1);
  }
  
  const shopifyOrderId = args[0];
  const customerPhone = args[1];
  
  console.log(`Triggering Shopify Order Status Automation for order ${shopifyOrderId}...`);
  
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'whatsapp-commerce';
    
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    
    // Get integrations
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    
    if (!integrations) {
      throw new Error('No integrations found in database');
    }
    
    // Trigger the automation
    const result = await triggerShopifyOrderStatusAutomation(db, integrations, shopifyOrderId, customerPhone);
    
    console.log('Automation triggered successfully:');
    console.log(JSON.stringify(result, null, 2));
    
    await client.close();
  } catch (error) {
    console.error('Error triggering automation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}