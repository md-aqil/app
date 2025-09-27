// Script to check recent logs for the new orders
// Usage: node scripts/checkRecentLogs.js

const { MongoClient } = require('mongodb');

async function main() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'WhatsApp_api';
    
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    
    // Check for recent logs for the new orders
    const newOrderIds = ['6986161979542', '6986146480278'];
    
    console.log('Checking logs for new orders...\n');
    
    for (const orderId of newOrderIds) {
      console.log(`Order ID: ${orderId}`);
      
      // Check for order activity logs
      const logs = await db.collection('order_activity_log').find({
        orderId: orderId
      }).sort({ timestamp: -1 }).toArray();
      
      if (logs.length > 0) {
        console.log(`  Found ${logs.length} activity logs:`);
        logs.forEach(log => {
          console.log(`    - ${log.timestamp} - ${log.activityType}`);
          if (log.details && log.details.message) {
            console.log(`      Message: ${log.details.message}`);
          }
          if (log.details && log.details.error) {
            console.log(`      Error: ${log.details.error}`);
          }
        });
      } else {
        console.log(`  No activity logs found`);
      }
      
      console.log('');
    }
    
    // Check for any recent logs regardless of order
    const recentLogs = await db.collection('order_activity_log').find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    console.log('Most recent activity logs:');
    recentLogs.forEach(log => {
      console.log(`- ${log.timestamp} - Order ${log.orderId} - ${log.activityType}`);
      if (log.details && log.details.message) {
        console.log(`  Message: ${log.details.message}`);
      }
      if (log.details && log.details.error) {
        console.log(`  Error: ${log.details.error}`);
      }
    });
    
    await client.close();
    console.log('\nLog check completed!');
  } catch (error) {
    console.error('Error checking logs:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}