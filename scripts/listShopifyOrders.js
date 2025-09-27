// Script to list Shopify orders
// Usage: node scripts/listShopifyOrders.js

const { MongoClient } = require('mongodb');

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
    
    // List recent orders
    const orders = await db.collection('orders').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log('Recent orders:');
    orders.forEach(order => {
      console.log(`- Order ID: ${order.shopifyOrderId}, Source: ${order.source}, Status: ${order.status}`);
    });
    
    await client.close();
  } catch (error) {
    console.error('Error listing orders:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}