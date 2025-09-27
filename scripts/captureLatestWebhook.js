// Script to capture and log the latest Shopify webhook payload
// This should be used temporarily to understand the actual data structure

const fs = require('fs').promises;
const path = require('path');
const { debugOrderPayload } = require('./debugWebhookPayload');

// Function to capture webhook payloads
async function captureLatestWebhook(req, res) {
  try {
    const topic = req.headers['x-shopify-topic'];
    const webhookId = req.headers['x-shopify-webhook-id'];
    
    console.log(`\n=== CAPTURING WEBHOOK: ${topic} ===`);
    console.log(`Webhook ID: ${webhookId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Save the payload to a file for analysis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `webhook_capture_${topic.replace('/', '_')}_${timestamp}.json`;
    const filepath = path.join(__dirname, '..', 'logs', filename);
    
    // Ensure logs directory exists
    try {
      await fs.mkdir(path.join(__dirname, '..', 'logs'), { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    
    // Save payload to file
    await fs.writeFile(filepath, JSON.stringify(req.body, null, 2));
    console.log(`Payload saved to: ${filepath}`);
    
    // If this is an order creation webhook, debug the phone number extraction
    if (topic === 'orders/create' && req.body) {
      const order = req.body;
      console.log(`Order ID: ${order.id}`);
      console.log(`Order Number: ${order.order_number}`);
      
      // Debug the payload structure
      const extractedPhone = debugOrderPayload(order);
      
      if (extractedPhone) {
        console.log(`✅ Phone number found: ${extractedPhone}`);
      } else {
        console.log(`❌ No phone number found in order payload`);
      }
    }
    
    console.log(`=== END WEBHOOK CAPTURE: ${topic} ===\n`);
    
    // Return success response
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error capturing webhook payload:', error);
    res.status(500).json({ error: 'Failed to capture webhook' });
  }
}

module.exports = captureLatestWebhook;