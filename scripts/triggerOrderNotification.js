// Script to manually trigger order notification for a specific order
// Usage: node scripts/triggerOrderNotification.js <shopifyOrderId> [phoneNumber]

const { MongoClient } = require('mongodb');
const ShopifyClient = require('../services/shopifyClient');
const WhatsAppTemplateSender = require('../utils/sendWhatsAppTemplate');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node scripts/triggerOrderNotification.js <shopifyOrderId> [phoneNumber]');
    console.log('Example: node scripts/triggerOrderNotification.js 6986088743062');
    console.log('Example: node scripts/triggerOrderNotification.js 6986088743062 +1234567890');
    process.exit(1);
  }
  
  const shopifyOrderId = args[0];
  const overridePhoneNumber = args[1]; // Optional phone number override
  
  console.log(`Triggering order notification for Shopify order ${shopifyOrderId}...`);
  
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
    
    // Initialize services
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    const whatsappSender = new WhatsAppTemplateSender(
      integrations.whatsapp.phoneNumberId,
      integrations.whatsapp.accessToken
    );
    
    // First, try to get the order from our database (which might have the phone number)
    console.log('Checking database for order information...');
    const dbOrder = await db.collection('orders').findOne({ shopifyOrderId: shopifyOrderId });
    
    let order, customerPhone;
    
    if (dbOrder && dbOrder.customerPhone) {
      console.log('✓ Found order in database with phone number');
      customerPhone = dbOrder.customerPhone;
      
      // Fetch the order from Shopify for other details
      console.log('Fetching order from Shopify...');
      order = await shopifyClient.getOrder(shopifyOrderId);
      
      if (!order) {
        throw new Error(`Order ${shopifyOrderId} not found in Shopify`);
      }
      
      console.log(`✓ Order found in Shopify`);
    } else {
      // If not in database or no phone number, fetch from Shopify directly
      console.log('Fetching order from Shopify...');
      order = await shopifyClient.getOrder(shopifyOrderId);
      
      if (!order) {
        throw new Error(`Order ${shopifyOrderId} not found in Shopify`);
      }
      
      console.log(`✓ Order found in Shopify`);
      console.log(`Order Number: ${order.orderNumber}`);
      console.log(`Financial Status: ${order.financialStatus}`);
      console.log(`Customer: ${order.customerName}`);
      
      // Determine customer phone number
      customerPhone = overridePhoneNumber;
      
      if (!customerPhone) {
        // Try to get phone from order data
        if (order.customerPhone) {
          customerPhone = order.customerPhone;
        } else if (order.shippingAddress && order.shippingAddress.phone) {
          customerPhone = order.shippingAddress.phone;
        } else if (order.billingAddress && order.billingAddress.phone) {
          customerPhone = order.billingAddress.phone;
        }
      }
    }
    
    if (!customerPhone) {
      console.log('⚠️  No customer phone number found. You can provide one as a second argument.');
      console.log('Example: node scripts/triggerOrderNotification.js 6986088743062 +1234567890');
      await client.close();
      process.exit(1);
    }
    
    console.log(`Customer Phone: ${customerPhone}`);
    
    // Format line items for the message
    const lineItems = order.lineItems || [];
    let itemsString = "";
    if (lineItems.length > 0) {
      itemsString = lineItems.map(item => 
        `• ${item.title} (x${item.quantity}) - ${item.price} ${order.currency}`
      ).join("\n");
    } else {
      itemsString = "No items";
    }
    
    // Send order confirmation using simple text message
    console.log('\nSending order confirmation via WhatsApp...');
    try {
      await whatsappSender.sendTextMessage(customerPhone, 
        `✅ *Order Confirmation*
        
Hello ${order.customerName || 'Customer'},
        
Thank you for your order #${order.orderNumber}!
        
Items:
${itemsString}

*Total: ${order.total} ${order.currency}*

Your order will be processed shortly. We'll notify you when it's shipped.
        
If you have any questions, feel free to ask!`);
      
      console.log('✓ Order confirmation sent successfully via WhatsApp');
      
      // Update database to mark that we've sent the notification
      await db.collection('orders').updateOne(
        { shopifyOrderId: shopifyOrderId },
        { 
          $set: { 
            whatsappConfirmationSent: new Date(),
            customerPhone: customerPhone
          }
        }
      );
      
      console.log('✓ Database updated with notification status');
    } catch (error) {
      console.log('✗ Failed to send order confirmation');
      console.log(`Error: ${error.message}`);
    }
    
    await client.close();
    console.log('\nOrder notification trigger completed!');
  } catch (error) {
    console.error('Error triggering order notification:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}