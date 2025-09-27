// Script to verify the order status after automation
// Usage: node scripts/verifyOrderStatus.js <shopifyOrderId>

const { MongoClient } = require('mongodb');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node scripts/verifyOrderStatus.js <shopifyOrderId>');
    console.log('Example: node scripts/verifyOrderStatus.js 6986088743062');
    process.exit(1);
  }
  
  const shopifyOrderId = args[0];
  
  console.log(`Verifying order status for order ${shopifyOrderId}...`);
  
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'WhatsApp_api';
    
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    
    // Get the order from database
    const order = await db.collection('orders').findOne({ shopifyOrderId: shopifyOrderId });
    
    if (!order) {
      console.log(`Order ${shopifyOrderId} not found in database`);
      await client.close();
      process.exit(1);
    }
    
    console.log('Order details:');
    console.log(`- Shopify Order ID: ${order.shopifyOrderId}`);
    console.log(`- Source: ${order.source}`);
    console.log(`- Status: ${order.status}`);
    console.log(`- Financial Status: ${order.financialStatus}`);
    console.log(`- Fulfillment Status: ${order.fulfillmentStatus}`);
    console.log(`- Customer Phone: ${order.customerPhone}`);
    console.log(`- Created At: ${order.createdAt}`);
    console.log(`- Updated At: ${order.updatedAt}`);
    
    // Check for automation logs
    const logs = await db.collection('order_activity_log').find({ 
      orderId: shopifyOrderId 
    }).sort({ timestamp: -1 }).toArray();
    
    if (logs.length > 0) {
      console.log('\nRecent activity logs:');
      logs.slice(0, 5).forEach(log => {
        console.log(`- ${log.timestamp} - ${log.activityType}: ${JSON.stringify(log.details)}`);
      });
    } else {
      console.log('\nNo activity logs found for this order');
    }
    
    await client.close();
    console.log('\nVerification completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error verifying order status:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}