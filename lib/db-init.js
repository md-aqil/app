// Database initialization script
// This script ensures all required collections exist and have proper indexes

import { MongoClient } from 'mongodb'
import config from '../config/index.js'

async function initializeDatabase() {
  // Use the same connection string format as in the main app
  const client = new MongoClient(config.mongodb.url)
  
  try {
    await client.connect()
    const db = client.db(config.mongodb.dbName)
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    // Collections needed for the chat system
    const requiredCollections = [
      'chats',
      'messages',
      'integrations',
      'orders',
      'products',
      'campaigns',
      'webhooks',
      'webhook_logs',
      'user_sessions', // New collection for WhatsApp checkout sessions
      'customers',     // New collection for Shopify customer data
      'pending_whatsapp_checkouts', // Collection for WhatsApp checkout flow
      'order_activity_log', // Collection for order activity tracking
      'message_status_log'  // New collection for WhatsApp message status tracking
    ]
    
    for (const collectionName of requiredCollections) {
      if (!collectionNames.includes(collectionName)) {
        await db.createCollection(collectionName)
        console.log(`Created collection: ${collectionName}`)
      }
    }
    
    // Create indexes for better performance
    await db.collection('chats').createIndex({ userId: 1, phone: 1 })
    await db.collection('messages').createIndex({ userId: 1, recipient: 1, timestamp: -1 })
    await db.collection('orders').createIndex({ userId: 1, shopifyOrderId: 1 })
    await db.collection('products').createIndex({ userId: 1 })
    await db.collection('campaigns').createIndex({ userId: 1, createdAt: -1 })
    await db.collection('webhook_logs').createIndex({ type: 1, receivedAt: -1 })
    await db.collection('user_sessions').createIndex({ phoneNumber: 1 }) // Index for session lookups
    await db.collection('user_sessions').createIndex({ lastActivity: 1 }) // Index for cleanup
    await db.collection('customers').createIndex({ userId: 1, shopifyCustomerId: 1 }) // Index for customer lookups
    await db.collection('pending_whatsapp_checkouts').createIndex({ customerPhone: 1, createdAt: -1 }) // Index for checkout lookups
    await db.collection('order_activity_log').createIndex({ orderId: 1, timestamp: -1 }) // Index for activity lookups
    await db.collection('message_status_log').createIndex({ messageId: 1, timestamp: -1 }) // Index for status lookups
    
    console.log('Database initialization completed successfully')
  } catch (error) {
    console.error('Database initialization failed:', error)
  } finally {
    await client.close()
  }
}

// Run the initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().then(() => {
    process.exit(0)
  }).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

export default initializeDatabase