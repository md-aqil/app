// Shopify Order Automation Trigger
// This module provides functionality to trigger the Shopify Order Status Automation
// when a WhatsApp checkout order is created in Shopify

const ShopifyClient = require('../services/shopifyClient');
const WhatsAppTemplateSender = require('../utils/sendWhatsAppTemplate');

/**
 * Trigger the Shopify Order Status Automation for a given Shopify order ID
 * This function properly triggers the webhook events that activate Shopify automations
 * @param {Object} db - Database connection
 * @param {Object} integrations - Integration configuration
 * @param {string} shopifyOrderId - The Shopify order ID
 * @param {string} customerPhone - Customer's phone number
 */
async function triggerShopifyOrderStatusAutomation(db, integrations, shopifyOrderId, customerPhone) {
  try {
    console.log(`Triggering Shopify Order Status Automation for order ${shopifyOrderId}`);
    
    // Initialize services
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    const whatsappSender = new WhatsAppTemplateSender(
      integrations.whatsapp.phoneNumberId,
      integrations.whatsapp.accessToken
    );
    
    // Fetch the complete order data from Shopify
    const order = await shopifyClient.getOrder(shopifyOrderId);
    
    if (!order) {
      throw new Error(`Order ${shopifyOrderId} not found in Shopify`);
    }
    
    // Update existing order in database with WhatsApp source
    const orderData = {
      id: `shopify-${order.id}`,
      userId: 'default',
      shopifyOrderId: order.id.toString(),
      orderNumber: order.order_number,
      customerName: getCustomerName(order),
      customerEmail: order.customer?.email,
      customerPhone: customerPhone || getCustomerPhone(order),
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItems: order.line_items || [],
      source: 'whatsapp', // Mark as WhatsApp source
      status: order.financial_status, // Use actual Shopify status
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at || order.created_at),
      trace_id: `whatsapp-${Date.now()}-${shopifyOrderId}` // For logging
    };
    
    // Update the order in database
    await db.collection('orders').updateOne(
      { shopifyOrderId: order.id.toString() },
      { $set: orderData },
      { upsert: true }
    );
    
    console.log(`Updated WhatsApp order ${shopifyOrderId} in database`);
    
    // Log activity
    await logOrderActivity(db, order.id.toString(), 'whatsapp_order_automation_triggered', {
      message: 'WhatsApp checkout order automation triggered',
      source: 'whatsapp',
      customerPhone: customerPhone
    });
    
    // Actually trigger the Shopify webhook events that activate automations
    // This simulates what Shopify would send when an order is created
    await simulateShopifyWebhookEvents(db, integrations, order, 'orders/create');
    
    // Send order confirmation via WhatsApp using simple text message
    if (orderData.customerPhone) {
      try {
        const itemsList = formatLineItems(orderData.lineItems);
        await whatsappSender.sendTextMessage(orderData.customerPhone, 
          `✅ *Order Confirmation*
          
Hello ${orderData.customerName || 'Customer'},
          
Thank you for your WhatsApp order #${orderData.orderNumber}!
          
Items:
${itemsList}

*Total: ${orderData.total} ${orderData.currency}*

Your order will be processed shortly. We'll notify you when it's shipped.
          
If you have any questions, feel free to ask!`);
        
        console.log(`Sent order confirmation to ${orderData.customerPhone}`);
        
        // Log activity
        await logOrderActivity(db, order.id.toString(), 'whatsapp_confirmation_sent', {
          message: 'Order confirmation sent via WhatsApp',
          customerPhone: orderData.customerPhone
        });
      } catch (error) {
        console.error(`Failed to send order confirmation to ${orderData.customerPhone}:`, error);
        // Log error
        await logOrderActivity(db, order.id.toString(), 'whatsapp_confirmation_error', {
          message: 'Failed to send order confirmation via WhatsApp',
          error: error.message,
          customerPhone: orderData.customerPhone
        });
      }
    } else {
      console.log(`No phone number found for order ${order.id}, skipping WhatsApp notification`);
    }
    
    return {
      success: true,
      message: 'Shopify Order Status Automation triggered successfully',
      orderId: shopifyOrderId,
      orderData: orderData
    };
  } catch (error) {
    console.error('Error triggering Shopify Order Status Automation:', error);
    
    // Log error
    await logOrderActivity(db, shopifyOrderId, 'automation_trigger_error', {
      message: 'Error triggering Shopify Order Status Automation',
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Simulate Shopify webhook events to trigger automations
 * @param {Object} db - Database connection
 * @param {Object} integrations - Integration configuration
 * @param {Object} order - The order object
 * @param {string} eventType - The type of event to simulate
 */
async function simulateShopifyWebhookEvents(db, integrations, order, eventType) {
  try {
    console.log(`Simulating Shopify webhook event: ${eventType} for order ${order.id}`);
    
    // Import the webhook handler function
    const handleShopifyWebhook = require('../routes/webhook/shopify');
    
    // Create a mock request object that simulates a Shopify webhook
    const mockReq = {
      headers: {
        'x-shopify-topic': eventType,
        'x-shopify-webhook-id': `whatsapp-trigger-${Date.now()}-${order.id}`
      },
      body: order
    };
    
    // Create a mock response object
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        return this;
      }
    };
    
    // Call the webhook handler with our mock request
    await handleShopifyWebhook(mockReq, mockRes, db, integrations);
    
    console.log(`Successfully simulated Shopify webhook event: ${eventType}`);
  } catch (error) {
    console.error(`Error simulating Shopify webhook event ${eventType}:`, error);
    throw error;
  }
}

/**
 * Helper function to get customer phone number from order
 * @param {Object} order - Shopify order object
 * @returns {string|null} - Customer phone number or null
 */
function getCustomerPhone(order) {
  // First try to get phone from customer object
  if (order.customer && order.customer.phone) {
    return order.customer.phone;
  }
  
  // Try to get phone from shipping address
  if (order.shipping_address && order.shipping_address.phone) {
    return order.shipping_address.phone;
  }
  
  // Try to get phone from billing address
  if (order.billing_address && order.billing_address.phone) {
    return order.billing_address.phone;
  }
  
  // Try to extract phone from shipping address name field if it contains a phone number
  // This handles cases where phone numbers are stored in the name field
  if (order.shipping_address && order.shipping_address.name) {
    const phoneMatch = order.shipping_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
    if (phoneMatch) {
      return phoneMatch[0].replace(/\s+/g, '');
    }
  }
  
  // Try to extract phone from billing address name field if it contains a phone number
  if (order.billing_address && order.billing_address.name) {
    const phoneMatch = order.billing_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
    if (phoneMatch) {
      return phoneMatch[0].replace(/\s+/g, '');
    }
  }
  
  // Return null if no phone found
  return null;
}

/**
 * Helper function to get customer name from order
 * @param {Object} order - Shopify order object
 * @returns {string} - Customer name
 */
function getCustomerName(order) {
  if (order.customer) {
    if (order.customer.first_name && order.customer.last_name) {
      return `${order.customer.first_name} ${order.customer.last_name}`;
    } else if (order.customer.first_name) {
      return order.customer.first_name;
    } else if (order.customer.last_name) {
      return order.customer.last_name;
    }
  }
  
  // Fallback to shipping address name
  if (order.shipping_address && order.shipping_address.name) {
    return order.shipping_address.name;
  }
  
  // Fallback to billing address name
  if (order.billing_address && order.billing_address.name) {
    return order.billing_address.name;
  }
  
  return "Customer";
}

/**
 * Helper function to format line items for messages
 * @param {Array} lineItems - Array of line items
 * @returns {string} - Formatted line items string
 */
function formatLineItems(lineItems) {
  if (!lineItems || lineItems.length === 0) {
    return "No items";
  }
  
  return lineItems.map(item => 
    `${item.title} (x${item.quantity})`
  ).join(", ");
}

/**
 * Log order activity for tracking and debugging
 * @param {Object} db - Database connection
 * @param {string} orderId - Order ID
 * @param {string} activityType - Type of activity
 * @param {Object} details - Activity details
 */
async function logOrderActivity(db, orderId, activityType, details) {
  try {
    await db.collection('order_activity_log').insertOne({
      orderId: orderId,
      activityType: activityType,
      details: details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging order activity:', error);
  }
}

module.exports = {
  triggerShopifyOrderStatusAutomation
};