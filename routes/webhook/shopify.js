// Shopify Webhook Handler
const ShopifyClient = require('../../services/shopifyClient');
const WhatsAppTemplateSender = require('../../utils/sendWhatsAppTemplate');
const config = require('../../config');

// In-memory store for processed webhooks (in production, use Redis or database)
const processedWebhooks = new Set();

// Function to get customer phone number
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

// Function to get customer name
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

// Function to format line items for messages
function formatLineItems(lineItems) {
  if (!lineItems || lineItems.length === 0) {
    return "No items";
  }
  
  return lineItems.map(item => 
    `${item.title} (x${item.quantity})`
  ).join(", ");
}

// Function to verify webhook signature
function verifyWebhookSignature(body, signature, secret) {
  // In a real implementation, you would verify the signature
  // For now, we'll just return true
  return true;
}

// Function to deduplicate webhooks
function isDuplicateWebhook(webhookId) {
  // Handle case where webhookId might be undefined
  if (!webhookId) {
    console.warn('Webhook ID is missing from request');
    return false; // Don't treat as duplicate if we can't identify it
  }
  
  if (processedWebhooks.has(webhookId)) {
    return true;
  }
  
  // Add to processed set
  processedWebhooks.add(webhookId);
  
  // Remove after 1 hour to prevent memory issues
  setTimeout(() => {
    processedWebhooks.delete(webhookId);
  }, 60 * 60 * 1000);
  
  return false;
}

// Main webhook handler
async function handleShopifyWebhook(req, res, db, integrations) {
  try {
    const topic = req.headers['x-shopify-topic'];
    const webhookId = req.headers['x-shopify-webhook-id'];
    
    console.log(`Received Shopify webhook: ${topic}`);
    
    // Log additional information for debugging
    console.log(`Webhook headers:`, {
      topic,
      webhookId,
      'x-shopify-hmac-sha256': req.headers['x-shopify-hmac-sha256'],
      'content-length': req.headers['content-length']
    });
    
    // Validate required headers
    if (!topic) {
      console.error('Missing x-shopify-topic header');
      return res.status(400).json({ error: 'Missing x-shopify-topic header' });
    }
    
    // Deduplicate webhooks (only if webhookId is provided)
    if (webhookId) {
      if (isDuplicateWebhook(webhookId)) {
        console.log(`Duplicate webhook ignored: ${webhookId}`);
        try {
          // For Next.js API routes, return the response directly
          return res.status(200).json({ success: true, message: 'Duplicate webhook ignored' });
        } catch (responseError) {
          console.error('Error sending duplicate webhook response:', responseError);
          // Still return to prevent further processing
          return;
        }
      }
    } else {
      console.warn('Webhook ID is missing - cannot deduplicate this webhook');
    }
    
    // Verify webhook signature (in production, implement proper verification)
    // const signature = req.headers['x-shopify-hmac-sha256'];
    // if (!verifyWebhookSignature(req.body, signature, integrations.shopify.webhookSecret)) {
    //   return res.status(401).json({ error: 'Webhook verification failed' });
    // }
    
    const payload = req.body;
    
    // Log payload size for debugging
    console.log(`Webhook payload size: ${JSON.stringify(payload).length} characters`);
    
    // Initialize WhatsApp sender
    const whatsappSender = new WhatsAppTemplateSender(
      integrations.whatsapp.phoneNumberId,
      integrations.whatsapp.accessToken
    );
    
    // Initialize Shopify client
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    // Handle different webhook topics
    switch (topic) {
      case 'orders/create':
        await handleOrderCreate(payload, db, whatsappSender, shopifyClient);
        break;
        
      case 'orders/updated':
        await handleOrderUpdated(payload, db, whatsappSender, shopifyClient);
        break;
        
      case 'orders/paid':
        await handleOrderPaid(payload, db, whatsappSender, shopifyClient);
        break;
        
      case 'orders/fulfilled':
        await handleOrderFulfilled(payload, db, whatsappSender, shopifyClient);
        break;
        
      case 'orders/cancelled':
        await handleOrderCancelled(payload, db, whatsappSender, shopifyClient);
        break;
        
      case 'customers/create':
      case 'customers/update':
        await handleCustomerUpdate(payload, db);
        break;
        
      default:
        console.log(`Unhandled Shopify webhook topic: ${topic}`);
    }
    
    // Return success response
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    // Return error response
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}

// Handle order creation
async function handleOrderCreate(order, db, whatsappSender, shopifyClient) {
  try {
    console.log(`Processing order creation: ${order.id}`);
    
    // Check if this order was created via WhatsApp checkout
    const isWhatsAppOrder = order.tags && order.tags.includes('whatsapp-checkout');
    
    // Get customer phone number
    let customerPhone = getCustomerPhone(order);
    
    // Save order to database
    const orderData = {
      id: `shopify-${order.id}`,
      userId: 'default',
      shopifyOrderId: order.id.toString(),
      orderNumber: order.order_number,
      customerName: getCustomerName(order),
      customerEmail: order.customer?.email,
      customerPhone: customerPhone,
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItems: order.line_items || [],
      source: isWhatsAppOrder ? 'whatsapp' : 'shopify', // Track the source
      status: order.financial_status || 'created', // Use actual Shopify status
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at || order.created_at)
    };
    
    await db.collection('orders').updateOne(
      { shopifyOrderId: order.id.toString() },
      { $set: orderData },
      { upsert: true }
    );
    
    console.log(`Saved order ${order.id} to database (source: ${orderData.source})`);
    
    // If we don't have a phone number, try to fetch complete order data
    if (!customerPhone) {
      console.log(`Fetching complete order data for order ${order.id}`);
      try {
        const completeOrder = await shopifyClient.getOrder(order.id);
        customerPhone = getCustomerPhone(completeOrder);
        orderData.customerPhone = customerPhone;
        
        // Update the database with complete data
        await db.collection('orders').updateOne(
          { shopifyOrderId: order.id.toString() },
          { $set: orderData }
        );
      } catch (error) {
        console.error(`Failed to fetch complete order data for ${order.id}:`, error);
      }
    }
    
    // For WhatsApp orders, the confirmation is already sent in the trigger function
    // Only send confirmation for non-WhatsApp orders to avoid duplicates
    if (!isWhatsAppOrder && customerPhone) {
      try {
        // Use simple text message instead of template
        const itemsList = formatLineItems(orderData.lineItems);
        await whatsappSender.sendTextMessage(customerPhone, 
          `✅ *Order Confirmation*
          
Hello ${orderData.customerName || 'Customer'},
          
Thank you for your order #${orderData.orderNumber}!
          
Items:
${itemsList}

*Total: ${orderData.total} ${orderData.currency}*

Your order will be processed shortly. We'll notify you when it's shipped.
          
If you have any questions, feel free to ask!`);
        
        console.log(`Sent order confirmation to ${customerPhone}`);
      } catch (error) {
        console.error(`Failed to send order confirmation to ${customerPhone}:`, error);
      }
    } else if (isWhatsAppOrder) {
      console.log(`Skipping duplicate confirmation for WhatsApp order ${order.id}`);
    } else {
      console.log(`No phone number found for order ${order.id}, skipping WhatsApp notification`);
    }
  } catch (error) {
    console.error(`Error handling order creation for ${order.id}:`, error);
  }
}

// Handle order updates
async function handleOrderUpdated(order, db, whatsappSender, shopifyClient) {
  try {
    console.log(`Processing order update: ${order.id}`);
    
    // Get customer phone number
    let customerPhone = getCustomerPhone(order);
    
    // Update order in database
    const orderData = {
      userId: 'default',
      shopifyOrderId: order.id.toString(),
      orderNumber: order.order_number,
      customerName: getCustomerName(order),
      customerEmail: order.customer?.email,
      customerPhone: customerPhone,
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItems: order.line_items || [],
      updatedAt: new Date(order.updated_at || order.created_at)
    };
    
    await db.collection('orders').updateOne(
      { shopifyOrderId: order.id.toString() },
      { $set: orderData }
    );
    
    console.log(`Updated order ${order.id} in database`);
    
    // If financial status is pending and we haven't sent a payment reminder yet
    if (order.financial_status === 'pending') {
      // Check if we've already sent a payment reminder
      const existingOrder = await db.collection('orders').findOne({ 
        shopifyOrderId: order.id.toString() 
      });
      
      // If we don't have a phone number, try to fetch complete order data
      if (!customerPhone) {
        console.log(`Fetching complete order data for order ${order.id}`);
        try {
          const completeOrder = await shopifyClient.getOrder(order.id);
          customerPhone = getCustomerPhone(completeOrder);
          orderData.customerPhone = customerPhone;
          
          // Update the database with complete data
          await db.collection('orders').updateOne(
            { shopifyOrderId: order.id.toString() },
            { $set: orderData }
          );
        } catch (error) {
          console.error(`Failed to fetch complete order data for ${order.id}:`, error);
        }
      }
      
      if (existingOrder && !existingOrder.paymentReminderSent && customerPhone) {
        try {
          // Create a draft order to generate payment link
          const draftOrderData = {
            line_items: order.line_items.map(item => ({
              variant_id: item.variant_id,
              quantity: item.quantity
            })),
            customer: {
              first_name: order.customer?.first_name || '',
              last_name: order.customer?.last_name || '',
              email: order.customer?.email || '',
              phone: customerPhone
            }
          };
          
          const draftOrder = await shopifyClient.createDraftOrder(draftOrderData);
          
          // Send payment reminder using simple text message
          const itemsList = formatLineItems(order.line_items);
          await whatsappSender.sendTextMessage(customerPhone, 
            `💳 *Payment Reminder*
            
Hello ${getCustomerName(order) || 'Customer'},
            
We noticed that payment is still pending for your order #${order.order_number}.
            
Items:
${itemsList}

*Amount: ${order.total_price} ${order.currency}*

Please complete your payment using the link below:
${draftOrder.invoice_url}
            
If you've already paid, please ignore this message. If you have any questions, feel free to ask!`);
          
          console.log(`Sent payment reminder to ${customerPhone}`);
          
          // Mark that we've sent the payment reminder
          await db.collection('orders').updateOne(
            { shopifyOrderId: order.id.toString() },
            { $set: { paymentReminderSent: new Date() } }
          );
        } catch (error) {
          console.error(`Failed to send payment reminder to ${customerPhone}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error handling order update for ${order.id}:`, error);
  }
}

// Handle order paid
async function handleOrderPaid(order, db, whatsappSender, shopifyClient) {
  try {
    console.log(`Processing order paid: ${order.id}`);
    
    // Get customer phone number
    let customerPhone = getCustomerPhone(order);
    
    // Update order status in database
    await db.collection('orders').updateOne(
      { shopifyOrderId: order.id.toString() },
      { 
        $set: { 
          financialStatus: 'paid',
          status: 'paid', // Unified status
          updatedAt: new Date(order.updated_at || order.created_at)
        }
      }
    );
    
    console.log(`Updated order ${order.id} as paid in database`);
    
    // If we don't have a phone number, try to fetch complete order data
    if (!customerPhone) {
      console.log(`Fetching complete order data for order ${order.id}`);
      try {
        const completeOrder = await shopifyClient.getOrder(order.id);
        customerPhone = getCustomerPhone(completeOrder);
        
        // Update the database with complete data
        await db.collection('orders').updateOne(
          { shopifyOrderId: order.id.toString() },
          { $set: { customerPhone: customerPhone } }
        );
      } catch (error) {
        console.error(`Failed to fetch complete order data for ${order.id}:`, error);
      }
    }
    
    if (customerPhone) {
      try {
        // Send payment confirmation using simple text message
        await whatsappSender.sendTextMessage(customerPhone, 
          `💰 *Payment Received*
          
Thank you for your payment! Your order #${order.order_number} has been successfully processed.
          
We'll notify you when your order is shipped. If you have any questions, feel free to ask!`);
        
        console.log(`Sent payment confirmation to ${customerPhone}`);
      } catch (error) {
        console.error(`Failed to send payment confirmation to ${customerPhone}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error handling order paid for ${order.id}:`, error);
  }
}

// Handle order fulfilled
async function handleOrderFulfilled(order, db, whatsappSender, shopifyClient) {
  try {
    console.log(`Processing order fulfilled: ${order.id}`);
    
    // Get customer phone number
    let customerPhone = getCustomerPhone(order);
    
    // Update order status in database
    await db.collection('orders').updateOne(
      { shopifyOrderId: order.id.toString() },
      { 
        $set: { 
          fulfillmentStatus: 'fulfilled',
          status: 'fulfilled', // Unified status
          updatedAt: new Date(order.updated_at || order.created_at)
        }
      }
    );
    
    console.log(`Updated order ${order.id} as fulfilled in database`);
    
    // If we don't have a phone number, try to fetch complete order data
    if (!customerPhone) {
      console.log(`Fetching complete order data for order ${order.id}`);
      try {
        const completeOrder = await shopifyClient.getOrder(order.id);
        customerPhone = getCustomerPhone(completeOrder);
        
        // Update the database with complete data
        await db.collection('orders').updateOne(
          { shopifyOrderId: order.id.toString() },
          { $set: { customerPhone: customerPhone } }
        );
      } catch (error) {
        console.error(`Failed to fetch complete order data for ${order.id}:`, error);
      }
    }
    
    if (customerPhone) {
      try {
        // Send shipment update using simple text message
        const trackingCompany = order.fulfillments?.[0]?.tracking_company || "N/A";
        const trackingNumber = order.fulfillments?.[0]?.tracking_number || "N/A";
        const trackingUrl = order.fulfillments?.[0]?.tracking_url || "N/A";
        
        await whatsappSender.sendTextMessage(customerPhone, 
          `📦 *Order Shipped*
          
Great news! Your order #${order.order_number} has been shipped.
          
Courier: ${trackingCompany}
Tracking Number: ${trackingNumber}
          
Track your package: ${trackingUrl}
          
Estimated delivery: 1-3 business days.
          
If you have any questions, feel free to ask!`);
        
        console.log(`Sent shipment update to ${customerPhone}`);
      } catch (error) {
        console.error(`Failed to send shipment update to ${customerPhone}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error handling order fulfilled for ${order.id}:`, error);
  }
}

// Handle order cancelled
async function handleOrderCancelled(order, db, whatsappSender, shopifyClient) {
  try {
    console.log(`Processing order cancelled: ${order.id}`);
    
    // Get customer phone number
    let customerPhone = getCustomerPhone(order);
    
    // Update order status in database
    await db.collection('orders').updateOne(
      { shopifyOrderId: order.id.toString() },
      { 
        $set: { 
          financialStatus: 'cancelled',
          status: 'cancelled', // Unified status
          updatedAt: new Date(order.updated_at || order.created_at)
        }
      }
    );
    
    console.log(`Updated order ${order.id} as cancelled in database`);
    
    // If we don't have a phone number, try to fetch complete order data
    if (!customerPhone) {
      console.log(`Fetching complete order data for order ${order.id}`);
      try {
        const completeOrder = await shopifyClient.getOrder(order.id);
        customerPhone = getCustomerPhone(completeOrder);
        
        // Update the database with complete data
        await db.collection('orders').updateOne(
          { shopifyOrderId: order.id.toString() },
          { $set: { customerPhone: customerPhone } }
        );
      } catch (error) {
        console.error(`Failed to fetch complete order data for ${order.id}:`, error);
      }
    }
    
    if (customerPhone) {
      try {
        // Send order cancelled notification using simple text message
        const cancelReason = order.cancel_reason || "Order was cancelled";
        
        await whatsappSender.sendTextMessage(customerPhone, 
          `❌ *Order Cancelled*
          
We're sorry to inform you that your order #${order.order_number} has been cancelled.
          
Reason: ${cancelReason}
          
If you have any questions or would like to place a new order, feel free to ask!`);
        
        console.log(`Sent order cancelled notification to ${customerPhone}`);
      } catch (error) {
        console.error(`Failed to send order cancelled notification to ${customerPhone}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error handling order cancelled for ${order.id}:`, error);
  }
}

// Handle customer updates
async function handleCustomerUpdate(customer, db) {
  try {
    console.log(`Processing customer update: ${customer.id}`);
    
    // Save customer to database
    const customerData = {
      id: `shopify-${customer.id}`,
      userId: 'default',
      shopifyCustomerId: customer.id.toString(),
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at || customer.created_at)
    };
    
    await db.collection('customers').updateOne(
      { shopifyCustomerId: customer.id.toString() },
      { $set: customerData },
      { upsert: true }
    );
    
    console.log(`Saved customer ${customer.id} to database`);
  } catch (error) {
    console.error(`Error handling customer update for ${customer.id}:`, error);
  }
}

module.exports = {
  handleShopifyWebhook,
  getCustomerPhone,
  getCustomerName
};
