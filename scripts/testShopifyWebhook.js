// Script to test Shopify webhook endpoint
// Usage: node scripts/testShopifyWebhook.js

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
    
    // Create a mock order object (similar to what Shopify would send)
    const mockOrder = {
      id: 6986088743062,
      order_number: 1001,
      customer: {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890"
      },
      total_price: "99.99",
      currency: "USD",
      financial_status: "paid",
      fulfillment_status: "fulfilled",
      line_items: [
        {
          title: "Test Product",
          quantity: 1,
          price: "99.99"
        }
      ],
      created_at: "2025-09-28T00:00:00+05:30",
      updated_at: "2025-09-28T01:00:00+05:30"
    };
    
    // Import the webhook handler function
    const handleShopifyWebhook = require('../routes/webhook/shopify');
    
    // Create a mock request object that simulates a Shopify webhook
    const mockReq = {
      headers: {
        'x-shopify-topic': 'orders/create',
        'x-shopify-webhook-id': `test-webhook-${Date.now()}-${mockOrder.id}`
      },
      body: mockOrder,
      method: 'POST'
    };
    
    // Create a mock response object
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        console.log(`Response status: ${code}`);
        return this;
      },
      json: function(data) {
        this.body = data;
        console.log(`Response body: ${JSON.stringify(data)}`);
        return this;
      }
    };
    
    console.log('Testing Shopify webhook handler with mock order data...');
    console.log(`Order ID: ${mockOrder.id}`);
    console.log(`Order Number: ${mockOrder.order_number}`);
    console.log(`Customer: ${mockOrder.customer.first_name} ${mockOrder.customer.last_name}`);
    console.log(`Total: ${mockOrder.total_price} ${mockOrder.currency}`);
    
    // Call the webhook handler with our mock request
    await handleShopifyWebhook(mockReq, mockRes, db, integrations);
    
    console.log('\nWebhook test completed successfully!');
    
    // Check if the order was saved to the database
    console.log('\nChecking if order was saved to database...');
    const savedOrder = await db.collection('orders').findOne({ shopifyOrderId: mockOrder.id.toString() });
    
    if (savedOrder) {
      console.log(`✓ Order ${mockOrder.id} found in database`);
      console.log(`  Source: ${savedOrder.source}`);
      console.log(`  Status: ${savedOrder.status}`);
      console.log(`  Customer Phone: ${savedOrder.customerPhone}`);
    } else {
      console.log(`✗ Order ${mockOrder.id} not found in database`);
    }
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('Error testing Shopify webhook:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}