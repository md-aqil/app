// Script to test WhatsApp message sending
// Usage: node scripts/testWhatsAppMessage.js <phoneNumber>

const { MongoClient } = require('mongodb');
const WhatsAppTemplateSender = require('../utils/sendWhatsAppTemplate');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node scripts/testWhatsAppMessage.js <phoneNumber>');
    console.log('Example: node scripts/testWhatsAppMessage.js +1234567890');
    process.exit(1);
  }
  
  const phoneNumber = args[0];
  
  console.log(`Testing WhatsApp message sending to ${phoneNumber}...`);
  
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
    
    // Initialize WhatsApp sender
    const whatsappSender = new WhatsAppTemplateSender(
      integrations.whatsapp.phoneNumberId,
      integrations.whatsapp.accessToken
    );
    
    // Send a simple text message first to test basic connectivity
    console.log('Sending test text message...');
    try {
      const textResult = await whatsappSender.sendTextMessage(phoneNumber, "This is a test message from the Shopify integration system.");
      console.log('✓ Text message sent successfully');
      console.log(`Message ID: ${textResult.messages[0].id}`);
    } catch (error) {
      console.log('✗ Failed to send text message');
      console.log(`Error: ${error.message}`);
    }
    
    // Send an order confirmation template
    console.log('\nSending order confirmation template...');
    try {
      const templateResult = await whatsappSender.sendOrderConfirmation(phoneNumber, {
        customerName: "John Doe",
        orderNumber: "1001",
        brand: "Our Store",
        items: "Test Product (x1)",
        eta: "1-3 business days",
        status: "Confirmed",
        trackUrl: "https://example.com/track/1001"
      });
      console.log('✓ Order confirmation template sent successfully');
      console.log(`Message ID: ${templateResult.messages[0].id}`);
    } catch (error) {
      console.log('✗ Failed to send order confirmation template');
      console.log(`Error: ${error.message}`);
    }
    
    await client.close();
    console.log('\nWhatsApp message test completed!');
  } catch (error) {
    console.error('Error testing WhatsApp message:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}