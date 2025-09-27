// Script to test if the webhook endpoint is working
// Usage: node scripts/testWebhookEndpoint.js

const { MongoClient } = require('mongodb');

async function main() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'WhatsApp_api';
    
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    
    // Check if we can access the database
    const collections = await db.listCollections().toArray();
    console.log('Database connection successful');
    console.log('Available collections:', collections.map(c => c.name));
    
    // Check integrations collection
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    if (integrations) {
      console.log('✓ Integrations found');
      console.log(`  Shopify Domain: ${integrations.shopify?.shopDomain}`);
      console.log(`  WhatsApp Phone ID: ${integrations.whatsapp?.phoneNumberId ? '✓ Configured' : '❌ Not configured'}`);
    } else {
      console.log('❌ No integrations found');
    }
    
    // Check orders collection
    const orderCount = await db.collection('orders').countDocuments();
    console.log(`\nOrders in database: ${orderCount}`);
    
    // Show recent orders
    const recentOrders = await db.collection('orders').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log('\nRecent orders:');
    recentOrders.forEach(order => {
      console.log(`- Order ${order.shopifyOrderId}: ${order.source} (${order.status})`);
    });
    
    await client.close();
    console.log('\n✅ Database test completed successfully');
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}