// Script to check webhook logs
// Usage: node scripts/checkWebhookLogs.js

const { MongoClient } = require('mongodb');

async function main() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'WhatsApp_api';
    
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    
    // Check for recent webhook logs
    console.log('Checking for recent webhook logs...');
    
    // Check for recent order activity logs
    const recentLogs = await db.collection('order_activity_log').find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    if (recentLogs.length > 0) {
      console.log(`Found ${recentLogs.length} recent activity logs:`);
      recentLogs.forEach(log => {
        console.log(`- ${log.timestamp} - Order ${log.orderId} - ${log.activityType}`);
        if (log.details && log.details.message) {
          console.log(`  Message: ${log.details.message}`);
        }
        if (log.details && log.details.error) {
          console.log(`  Error: ${log.details.error}`);
        }
      });
    } else {
      console.log('No recent activity logs found');
    }
    
    // Check for any error logs specifically
    const errorLogs = await db.collection('order_activity_log').find({
      'details.error': { $exists: true }
    }).sort({ timestamp: -1 }).limit(5).toArray();
    
    if (errorLogs.length > 0) {
      console.log('\nRecent error logs:');
      errorLogs.forEach(log => {
        console.log(`- ${log.timestamp} - Order ${log.orderId} - ${log.activityType}`);
        console.log(`  Error: ${log.details.error}`);
      });
    } else {
      console.log('\nNo recent error logs found');
    }
    
    await client.close();
    console.log('\nWebhook log check completed!');
  } catch (error) {
    console.error('Error checking webhook logs:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}