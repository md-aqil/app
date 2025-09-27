// Script to check a specific Shopify order
// Usage: node scripts/checkSpecificOrder.js <shopifyOrderId>

const { MongoClient } = require('mongodb');
const ShopifyClient = require('../services/shopifyClient');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node scripts/checkSpecificOrder.js <shopifyOrderId>');
    console.log('Example: node scripts/checkSpecificOrder.js 6986099884182');
    process.exit(1);
  }
  
  const shopifyOrderId = args[0];
  
  console.log(`Checking Shopify order ${shopifyOrderId}...`);
  
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
    
    // Try to fetch the order from Shopify
    console.log('Fetching order from Shopify...');
    let shopifyOrder;
    try {
      shopifyOrder = await shopifyClient.getOrder(shopifyOrderId);
      console.log('✓ Order found in Shopify');
    } catch (error) {
      console.log('✗ Order not found in Shopify');
      console.log(`Error: ${error.message}`);
      await client.close();
      process.exit(1);
    }
    
    // Display order details
    console.log('\nShopify Order Details:');
    console.log(`- ID: ${shopifyOrder.id}`);
    console.log(`- Order Number: ${shopifyOrder.orderNumber}`);
    console.log(`- Financial Status: ${shopifyOrder.financialStatus}`);
    console.log(`- Fulfillment Status: ${shopifyOrder.fulfillmentStatus}`);
    console.log(`- Total: ${shopifyOrder.total} ${shopifyOrder.currency}`);
    console.log(`- Customer: ${shopifyOrder.customerName}`);
    console.log(`- Customer Email: ${shopifyOrder.customerEmail}`);
    console.log(`- Customer Phone: ${shopifyOrder.customerPhone}`);
    
    // Check if order exists in our database
    console.log('\nChecking database...');
    const dbOrder = await db.collection('orders').findOne({ shopifyOrderId: shopifyOrderId });
    
    if (dbOrder) {
      console.log('✓ Order found in database');
      console.log(`  Source: ${dbOrder.source}`);
      console.log(`  Status: ${dbOrder.status}`);
      console.log(`  Customer Phone: ${dbOrder.customerPhone}`);
      
      // Check for activity logs
      const logs = await db.collection('order_activity_log').find({ 
        orderId: shopifyOrderId 
      }).sort({ timestamp: -1 }).toArray();
      
      if (logs.length > 0) {
        console.log('\nRecent activity logs:');
        logs.slice(0, 3).forEach(log => {
          console.log(`- ${log.timestamp} - ${log.activityType}`);
        });
      } else {
        console.log('\nNo activity logs found');
      }
    } else {
      console.log('✗ Order not found in database');
      console.log('This means the Shopify webhook is not working properly for this order');
    }
    
    await client.close();
    console.log('\nOrder check completed!');
  } catch (error) {
    console.error('Error checking order:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}