// Script to list recent orders
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function listOrders() {
  let client;
  try {
    console.log('Listing recent orders...');
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    const orders = await db.collection('orders')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`Found ${orders.length} orders:`);
    orders.forEach((order, i) => {
      console.log(`${i+1}. #${order.orderNumber} - ${order.status} - ${order.customerPhone}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

listOrders();