// Script to test webhook processing with phone number data
// Usage: node scripts/testWebhookWithPhone.js

const { MongoClient } = require('mongodb');
const WhatsAppTemplateSender = require('../utils/sendWhatsAppTemplate');

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
    
    // Create a mock order object with phone number (similar to what we expect from Shopify)
    const mockOrder = {
      id: 6986130129046,
      order_number: 1005,
      customer: {
        first_name: "Monika",
        last_name: "Arya",
        email: "monika.arya@example.com",
        phone: "+917210562014" // This is the phone number from the order details
      },
      total_price: "11798.82",
      currency: "INR",
      financial_status: "pending",
      fulfillment_status: null,
      line_items: [
        {
          title: "Banarasi Silk With Dulha Dulhan Motif",
          quantity: 1,
          price: "9999.00"
        }
      ],
      shipping_address: {
        first_name: "Monika",
        last_name: "Arya",
        address1: "D - 154, opposite to Geeta Bhawan, Block D, Kamla Nagar",
        address2: "",
        city: "Delhi",
        province: "Delhi",
        province_code: "DL",
        country: "India",
        country_code: "IN",
        zip: "110007",
        phone: "+917210562014" // Phone number in shipping address
      },
      billing_address: {
        first_name: "Monika",
        last_name: "Arya",
        address1: "D - 154, opposite to Geeta Bhawan, Block D, Kamla Nagar",
        address2: "",
        city: "Delhi",
        province: "Delhi",
        province_code: "DL",
        country: "India",
        country_code: "IN",
        zip: "110007",
        phone: "+917210562014" // Phone number in billing address
      },
      created_at: "2025-09-28T01:19:41+05:30",
      updated_at: "2025-09-28T01:19:41+05:30"
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
    
    console.log('Testing Shopify webhook handler with phone number data...');
    console.log(`Order ID: ${mockOrder.id}`);
    console.log(`Order Number: ${mockOrder.order_number}`);
    console.log(`Customer Phone: ${mockOrder.customer.phone}`);
    
    // Call the webhook handler with our mock request
    await handleShopifyWebhook(mockReq, mockRes, db, integrations);
    
    console.log('\nWebhook test completed successfully!');
    
    // Check if the order was saved to the database with phone number
    console.log('\nChecking if order was saved to database with phone number...');
    const savedOrder = await db.collection('orders').findOne({ shopifyOrderId: mockOrder.id.toString() });
    
    if (savedOrder) {
      console.log(`✓ Order ${mockOrder.id} found in database`);
      console.log(`  Source: ${savedOrder.source}`);
      console.log(`  Status: ${savedOrder.status}`);
      console.log(`  Customer Phone: ${savedOrder.customerPhone}`);
      
      if (savedOrder.customerPhone) {
        console.log(`✓ Phone number correctly captured: ${savedOrder.customerPhone}`);
        
        // Try to send a test message to verify WhatsApp functionality
        try {
          const whatsappSender = new WhatsAppTemplateSender(
            integrations.whatsapp.phoneNumberId,
            integrations.whatsapp.accessToken
          );
          
          await whatsappSender.sendTextMessage(savedOrder.customerPhone, 
            `✅ *Test Message*
            
This is a test message to confirm that the WhatsApp integration is working correctly.
            
Order #${mockOrder.order_number} has been processed successfully.
            
Thank you!`);
          
          console.log('✓ Test message sent successfully');
        } catch (error) {
          console.log(`⚠️  Could not send test message: ${error.message}`);
        }
      } else {
        console.log(`❌ Phone number not captured`);
      }
    } else {
      console.log(`✗ Order ${mockOrder.id} not found in database`);
    }
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('Error testing webhook:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}