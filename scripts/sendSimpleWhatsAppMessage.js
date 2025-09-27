// Script to send a simple WhatsApp text message
// Usage: node scripts/sendSimpleWhatsAppMessage.js <phoneNumber>

const { MongoClient } = require('mongodb');
const WhatsAppTemplateSender = require('../utils/sendWhatsAppTemplate');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node scripts/sendSimpleWhatsAppMessage.js <phoneNumber>');
    console.log('Example: node scripts/sendSimpleWhatsAppMessage.js +917210562014');
    process.exit(1);
  }
  
  const phoneNumber = args[0];
  
  console.log(`Sending simple WhatsApp message to ${phoneNumber}...`);
  
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
    
    // Send a simple text message
    console.log('Sending test text message...');
    try {
      const result = await whatsappSender.sendTextMessage(phoneNumber, 
        `🛍️ *Order Confirmation*
        
Your order #1005 has been successfully created!
        
Items:
• Banarasi Silk With Dulha Dulhan Motif (x1) - ₹9,999.00

Total: ₹11,798.82
        
Thank you for your order! We'll notify you when it's shipped.`);
      
      console.log('✓ Text message sent successfully');
      console.log(`Message ID: ${result.messages[0].id}`);
    } catch (error) {
      console.log('✗ Failed to send text message');
      console.log(`Error: ${error.message}`);
      
      // Check if it's the opt-in error
      if (error.message.includes('131030') || error.message.includes('allowed list')) {
        console.log('\n⚠️  IMPORTANT: The customer needs to send a message to your WhatsApp Business number first to opt-in before you can message them.');
      }
    }
    
    await client.close();
    console.log('\nMessage sending test completed!');
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}