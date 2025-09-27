// Script to capture and log Shopify webhook payloads for analysis
// This should be used temporarily to understand the actual data structure

const { MongoClient } = require('mongodb');
const fs = require('fs').promises;

// Function to capture webhook payloads
async function captureWebhookPayload(req, res, db, integrations) {
  try {
    const topic = req.headers['x-shopify-topic'];
    const webhookId = req.headers['x-shopify-webhook-id'];
    
    console.log(`\n=== CAPTURED WEBHOOK: ${topic} ===`);
    console.log(`Webhook ID: ${webhookId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Save the payload to a file for analysis
    const filename = `webhook_${topic.replace('/', '_')}_${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(req.body, null, 2));
    console.log(`Payload saved to: ${filename}`);
    
    // Log key information
    if (topic === 'orders/create' && req.body) {
      const order = req.body;
      console.log(`Order ID: ${order.id}`);
      console.log(`Order Number: ${order.order_number}`);
      
      // Check for phone numbers in all possible locations
      console.log('\nPhone Number Analysis:');
      if (order.customer?.phone) {
        console.log(`  ✅ Customer Phone: ${order.customer.phone}`);
      }
      if (order.shipping_address?.phone) {
        console.log(`  ✅ Shipping Address Phone: ${order.shipping_address.phone}`);
      }
      if (order.billing_address?.phone) {
        console.log(`  ✅ Billing Address Phone: ${order.billing_address.phone}`);
      }
      
      // Show customer information
      console.log('\nCustomer Information:');
      console.log(`  First Name: ${order.customer?.first_name || 'null'}`);
      console.log(`  Last Name: ${order.customer?.last_name || 'null'}`);
      console.log(`  Email: ${order.customer?.email || 'null'}`);
      
      // Show address information
      console.log('\nShipping Address:');
      console.log(`  First Name: ${order.shipping_address?.first_name || 'null'}`);
      console.log(`  Last Name: ${order.shipping_address?.last_name || 'null'}`);
      console.log(`  Name: ${order.shipping_address?.name || 'null'}`);
      
      console.log('\nBilling Address:');
      console.log(`  First Name: ${order.billing_address?.first_name || 'null'}`);
      console.log(`  Last Name: ${order.billing_address?.last_name || 'null'}`);
      console.log(`  Name: ${order.billing_address?.name || 'null'}`);
    }
    
    console.log(`=== END WEBHOOK: ${topic} ===\n`);
    
    // Return success response
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error capturing webhook payload:', error);
    res.status(500).json({ error: 'Failed to capture webhook' });
  }
}

module.exports = captureWebhookPayload;