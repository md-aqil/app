import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
const config = require('../../../config')
const logger = require('../../../utils/logger')
const { asyncHandler, errorHandler } = require('../../../middleware/errorHandler')

// Import our new modular handlers
const handleShopifyWebhook = require('../../../routes/webhook/shopify')
const { handleWhatsAppWebhook } = require('../../../routes/webhook/whatsapp')

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(config.mongodb.url)
    await client.connect()
    db = client.db(config.mongodb.dbName)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response, request) {
  // Get the origin from the request
  const origin = request?.headers?.get('origin') || '';
  
  // Set allowed origins
  const allowedOrigins = config.cors.origins;
  let originHeader = '*'; // Default to allow all
  
  // If we have an origin, check if it's allowed
  if (origin) {
    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (origin === allowedOrigin) return true;
      
      // Handle wildcard domains like *.myshopify.com
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2); // Remove '*.'
        return origin.endsWith(domain);
      }
      
      return false;
    });
    
    // If the origin is allowed, set it specifically
    // This is important for credentials to work with specific origins
    if (isAllowed) {
      originHeader = origin;
    } else if (allowedOrigins.includes('*')) {
      // If not explicitly allowed but we allow all origins, use the specific origin
      // This is required for credentials to work properly
      originHeader = origin;
    }
  }
  
  // Only set one value for Access-Control-Allow-Origin
  response.headers.set('Access-Control-Allow-Origin', originHeader);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
}

// OPTIONS handler for CORS
export async function OPTIONS(request) {
  const response = new NextResponse(null, { status: 200 })
  return handleCORS(response, request)
}

// WhatsApp API functions
async function sendWhatsAppMessage(phoneNumberId, accessToken, to, messageData) {
  const url = `${config.whatsapp.baseUrl}/${config.whatsapp.apiVersion}/${phoneNumberId}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messageData)
  })

  const data = await response.json()
  
  if (!response.ok) {
    logger.error('WhatsApp API Error:', data);
    // Special handling for "Recipient phone number not in allowed list" error
    if (data?.error?.code === 131030) {
      throw new Error(`(#131030) Recipient phone number not in allowed list. The customer needs to send a message to your WhatsApp Business number first to opt-in before you can message them.`);
    }
    // Special handling for access token expiration
    else if (data?.error?.code === 190) {
      throw new Error(`(#190) WhatsApp access token has expired. Please refresh your token in the integration settings.`);
    }
    throw new Error(data.error?.message || `WhatsApp API error: ${response.status} ${response.statusText}`)
  }
  
  // Additional validation that the message was accepted
  if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
    logger.error('Unexpected WhatsApp API response:', data);
    throw new Error('WhatsApp API returned unexpected response format')
  }
  
  return data
}

// Function to save incoming WhatsApp messages to database
async function saveIncomingMessage(db, messageData) {
  logger.debug('saveIncomingMessage called with:', messageData);
  
  // Extract data based on message type
  const { from, text, timestamp, type, image, document, audio, video, location, contacts } = messageData;
  
  // Create message object
  const message = {
    id: uuidv4(),
    userId: 'default',
    recipient: from,
    phone: from,
    message: '',
    isCustomer: true,
    timestamp: new Date(timestamp ? timestamp * 1000 : Date.now()),
    whatsappMessageId: messageData.id,
    status: 'received',
    messageType: type || 'unknown'
  };
  
  // Handle different message types
  if (type === 'text' && text?.body) {
    message.message = text.body;
    logger.debug('Processing text message:', text.body);
  } else if (type === 'image') {
    message.message = '[Image message received]';
  } else if (type === 'document') {
    message.message = '[Document message received]';
  } else if (type === 'audio') {
    message.message = '[Audio message received]';
  } else if (type === 'video') {
    message.message = '[Video message received]';
  } else if (type === 'location' && location) {
    message.message = `[Location: ${location.latitude}, ${location.longitude}]`;
  } else if (type === 'contacts' && contacts) {
    message.message = '[Contact information received]';
  } else {
    // Fallback for unknown message types
    message.message = '[Message received]';
    logger.debug('Unknown message type or missing content:', messageData);
  }
  
  logger.debug('Saving message to database:', message);
  
  // Save to database
  await db.collection('messages').insertOne(message);
  
  // Update or create chat in the chats collection
  const chat = await db.collection('chats').findOne({ phone: from });
  
  if (chat) {
    // Update existing chat
    await db.collection('chats').updateOne(
      { phone: from },
      {
        $set: {
          lastMessage: message.message,
          timestamp: message.timestamp,
          unread: chat.unread + 1
        }
      }
    );
  } else {
    // Create new chat
    await db.collection('chats').insertOne({
      id: uuidv4(),
      userId: 'default',
      phone: from,
      name: `Customer ${from}`,
      lastMessage: message.message,
      timestamp: message.timestamp,
      unread: 1,
      avatar: `https://ui-avatars.com/api/?name=Customer&background=random`
    });
  }
  
  return message;
}

// Function to save outgoing WhatsApp messages to database
async function saveOutgoingMessage(db, to, messageText, whatsappResponse) {
  const message = {
    id: uuidv4(),
    userId: 'default',
    recipient: to,
    phone: to,
    message: messageText,
    isCustomer: false,
    timestamp: new Date(),
    whatsappMessageId: whatsappResponse.messages?.[0]?.id,
    status: 'sent'
  };
  
  await db.collection('messages').insertOne(message);
  
  // Update or create chat in the chats collection
  const chat = await db.collection('chats').findOne({ phone: to });
  
  if (chat) {
    // Update existing chat
    await db.collection('chats').updateOne(
      { phone: to },
      {
        $set: {
          lastMessage: messageText,
          timestamp: new Date()
        }
      }
    );
  } else {
    // Create new chat
    await db.collection('chats').insertOne({
      id: uuidv4(),
      userId: 'default',
      phone: to,
      name: `Customer ${to}`,
      lastMessage: messageText,
      timestamp: new Date(),
      unread: 0,
      avatar: `https://ui-avatars.com/api/?name=Customer&background=random`
    });
  }
  
  return message;
}

// Shopify API functions
async function fetchShopifyProducts(shopDomain, accessToken) {
  const url = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}/products.json`
  
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()
  if (!response.ok) {
    let errorMessage = 'Shopify API error';
    if (data && typeof data === 'object') {
      if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      errorMessage = data;
    }
    throw new Error(errorMessage);
  }

  return data.products.map(product => ({
    id: product.id.toString(),
    title: product.title,
    description: product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200),
    price: product.variants[0]?.price || '0.00',
    image: product.images[0]?.src,
    handle: product.handle
  }))
}

async function fetchShopifyOrders(shopDomain, accessToken) {
  const url = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}/orders.json?status=any`
  
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()
  if (!response.ok) {
    let errorMessage = 'Shopify API error';
    if (data && typeof data === 'object') {
      if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      errorMessage = data;
    }
    throw new Error(errorMessage);
  }

  // Transform Shopify orders to match our internal format
  return data.orders.map(order => ({
    id: `shopify-${order.id}`,
    userId: 'default',
    shopifyOrderId: order.id.toString(),
    orderNumber: order.order_number,
    customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
    customerEmail: order.customer?.email,
    customerPhone: order.customer?.phone,
    total: order.total_price,
    currency: order.currency,
    status: order.financial_status,
    lineItems: order.line_items || [],
    createdAt: new Date(order.created_at),
    updatedAt: new Date(order.updated_at || order.created_at)
  }))
}

async function fetchCompleteShopifyOrder(shopDomain, accessToken, orderId) {
  const url = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}/orders/${orderId}.json`;
  
  logger.debug(`Fetching complete order ${orderId} from Shopify API: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (!response.ok) {
    logger.error(`Shopify API error fetching complete order ${orderId}:`, data.errors || response.status);
    let errorMessage = 'Shopify API error fetching complete order';
    if (data && typeof data === 'object') {
      if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      errorMessage = data;
    }
    throw new Error(errorMessage);
  }

  logger.debug(`Successfully fetched complete order ${orderId}`);
  return data.order;
}

async function createShopifyWebhook(shopDomain, accessToken, topic, webhookUrl) {
  const url = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}/webhooks.json`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      webhook: {
        topic: topic,
        address: webhookUrl,
        format: 'json'
      }
    })
  })

  const data = await response.json()
  if (!response.ok) {
    let errorMessage = 'Shopify webhook creation error';
    if (data && typeof data === 'object') {
      if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      errorMessage = data;
    }
    throw new Error(errorMessage);
  }
  
  return data.webhook
}

// Add this new function to create a Shopify draft order
async function createShopifyDraftOrder(shopDomain, accessToken, draftOrderData) {
  const url = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}/draft_orders.json`
  
  logger.debug('Creating Shopify draft order with data:', draftOrderData);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(draftOrderData)
  })

  const data = await response.json()
  logger.debug('Shopify draft order response:', data);
  
  if (!response.ok) {
    logger.error('Shopify draft order creation failed:', data);
    let errorMessage = 'Shopify draft order creation error';
    if (data && typeof data === 'object') {
      if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      errorMessage = data;
    }
    throw new Error(errorMessage);
  }
  
  return data.draft_order
}

async function createShopifyOrder(shopDomain, accessToken, orderData) {
  const url = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}/orders.json`

  logger.debug('Creating Shopify order with data:', orderData);

  const orderResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  });

  const orderResult = await orderResponse.json();
              
  if (!orderResponse.ok) {
    let errorMessage = 'Failed to create order';
    if (orderResult && typeof orderResult === 'object') {
      if (orderResult.errors) {
        if (typeof orderResult.errors === 'object') {
          if (Object.keys(orderResult.errors).length > 0) {
            const errorMessages = [];
            for (const [field, messages] of Object.entries(orderResult.errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else {
            errorMessage = JSON.stringify(orderResult.errors);
          }
        } else {
          errorMessage = orderResult.errors;
        }
      } else {
        errorMessage = JSON.stringify(orderResult);
      }
    } else if (typeof orderResult === 'string') {
      errorMessage = orderResult;
    }
    throw new Error(errorMessage);
  }

  logger.debug('Shopify order response:', orderResult);

  return orderResult.order;
}

// Add this new function to send an invoice for a draft order
async function sendShopifyDraftOrderInvoice(shopDomain, accessToken, draftOrderId, invoiceData) {
  const url = `https://${shopDomain}/admin/api/${config.shopify.apiVersion}/draft_orders/${draftOrderId}/send_invoice.json`
  
  logger.debug(`Sending Shopify draft order invoice for order ${draftOrderId} with data:`, invoiceData);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invoiceData)
  })

  const data = await response.json()
  logger.debug('Shopify draft order invoice response:', data);
  
  if (!response.ok) {
    logger.error('Shopify draft order invoice failed:', data);
    let errorMessage = 'Shopify draft order invoice error';
    if (data && typeof data === 'object') {
      if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (typeof data === 'string') {
      errorMessage = data;
    }
    throw new Error(errorMessage);
  }
  
  return data.draft_order
}

// Stripe functions
async function createStripeCheckoutSession(lineItems, metadata) {
  // This would integrate with Stripe API
  // Placeholder for now
  const sessionId = uuidv4()
  const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`
  
  return {
    id: sessionId,
    url: checkoutUrl
  }
}

// Campaign functions
async function sendCampaignToRecipients(campaign, integrations, db) {
  const { whatsapp } = integrations
  let recipients = []
  
  // Determine recipients based on audience
  if (campaign.audience === 'all_customers') {
    // Get all customers from orders
    const orders = await db.collection('orders').find({ userId: 'default' }).toArray()
    recipients = [...new Set(orders.map(order => order.customerPhone).filter(phone => phone))]
  } else if (campaign.audience === 'recent_buyers') {
    // Get customers from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const orders = await db.collection('orders').find({ 
      userId: 'default',
      createdAt: { $gte: thirtyDaysAgo }
    }).toArray()
    recipients = [...new Set(orders.map(order => order.customerPhone).filter(phone => phone))]
  } else if (campaign.audience === 'custom') {
    recipients = campaign.recipients || []
  }

  // Send messages to all recipients
  const results = []
  for (const recipient of recipients) {
    try {
      const messageData = {
        messaging_product: "whatsapp",
        to: recipient.replace(/\D/g, ''),
        type: "text",
        text: {
          body: campaign.message
        }
      }

      logger.debug(`Sending message to ${recipient}...`);
      const result = await sendWhatsAppMessage(
        whatsapp.phoneNumberId,
        whatsapp.accessToken,
        recipient,
        messageData
      )
      logger.debug(`Message sent successfully to ${recipient}:`, result);

      results.push({
        recipient,
        success: true,
        messageId: result.messages?.[0]?.id
      })

      // Log the message
      await db.collection('messages').insertOne({
        id: uuidv4(),
        userId: 'default',
        campaignId: campaign.id,
        recipient,
        message: campaign.message,
        whatsappMessageId: result.messages?.[0]?.id,
        status: 'sent',
        sentAt: new Date()
      })

    } catch (error) {
      logger.error(`Failed to send message to ${recipient}:`, error.message);
      results.push({
        recipient,
        success: false,
        error: error.message
      })
      
      // Log the error
      await db.collection('messages').insertOne({
        id: uuidv4(),
        userId: 'default',
        campaignId: campaign.id,
        recipient,
        message: campaign.message,
        status: 'failed',
        error: error.message,
        sentAt: new Date()
      })
    }
  }

  return results
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = path.length > 0 ? `/${path.join('/')}` : '/'
  const method = request.method

  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    return handleCORS(new NextResponse(null, { status: 200 }))
  }

  logger.debug(`Processing route: ${route}, method: ${method}, path array:`, path)

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "WhatsApp Commerce Hub API" }), request)
    }

    // Integrations endpoints
    if (route === '/integrations' && method === 'GET') {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      
      const defaultIntegrations = {
        whatsapp: { connected: false, data: {} },
        shopify: { connected: false, data: {} },
        stripe: { connected: false, data: {} }
      }

      if (integrations) {
        // Check if integrations are properly configured
        defaultIntegrations.whatsapp.connected = !!(integrations.whatsapp?.phoneNumberId && integrations.whatsapp?.accessToken)
        defaultIntegrations.shopify.connected = !!(integrations.shopify?.shopDomain && integrations.shopify?.accessToken)
        defaultIntegrations.stripe.connected = !!(integrations.stripe?.secretKey)
        
        // Return data without sensitive fields
        defaultIntegrations.whatsapp.data = {
          phoneNumberId: integrations.whatsapp?.phoneNumberId || '',
          businessAccountId: integrations.whatsapp?.businessAccountId || '',
          webhookVerifyToken: integrations.whatsapp?.webhookVerifyToken || config.whatsapp.webhookVerifyToken
        }
        defaultIntegrations.shopify.data = {
          shopDomain: integrations.shopify?.shopDomain || '',
          apiKey: integrations.shopify?.apiKey || '',
          webhookVerifyToken: integrations.shopify?.webhookVerifyToken || config.shopify.webhookVerifyToken
        }
        defaultIntegrations.stripe.data = {
          publishableKey: integrations.stripe?.publishableKey || ''
        }
      }

      return handleCORS(NextResponse.json(defaultIntegrations), request)
    }

    if (route === '/integrations' && method === 'POST') {
      const body = await request.json();
      const { type, data } = body

      if (!type || !data) {
        return handleCORS(NextResponse.json(
          { error: "Type and data are required" }, 
          { status: 400 }
        ), request)
      }

      // Get existing integration data to preserve sensitive fields when updating
      const existingIntegrations = await db.collection('integrations').findOne({ userId: 'default' });
      const existingIntegration = existingIntegrations?.[type] || {};

      // For updates, preserve sensitive fields that aren't being provided in the new data
      // Only preserve fields that are likely to be sensitive (accessToken, secretKey, apiKey)
      const sensitiveFields = ['accessToken', 'secretKey', 'apiKey'];
      const mergedData = { ...data };

      // Preserve sensitive fields if they're not provided in the new data
      for (const field of sensitiveFields) {
        if (!data[field] && existingIntegration[field]) {
          mergedData[field] = existingIntegration[field];
        }
      }

      // Test the integration before saving (only if we have credentials to test)
      let testSuccess = true;
      let testError = null;
      
      try {
        if (type === 'whatsapp' && mergedData.phoneNumberId && mergedData.accessToken) {
          // Test WhatsApp connection by getting phone number info
          const testUrl = `${config.whatsapp.baseUrl}/${config.whatsapp.apiVersion}/${mergedData.phoneNumberId}`
          const testResponse = await fetch(testUrl, {
            headers: { 'Authorization': `Bearer ${mergedData.accessToken}` }
          })
          if (!testResponse.ok) {
            testSuccess = false;
            const errorData = await testResponse.json().catch(() => ({}));
            testError = errorData?.error?.message || 'Invalid WhatsApp credentials';
          }
        }

        if (type === 'shopify' && mergedData.shopDomain && mergedData.accessToken) {
          // Test Shopify connection
          await fetchShopifyProducts(mergedData.shopDomain, mergedData.accessToken)
        }

        if (type === 'stripe' && mergedData.secretKey) {
          // Test Stripe connection (placeholder)
          if (!mergedData.secretKey.startsWith('sk_')) {
            testSuccess = false;
            testError = 'Invalid Stripe secret key format';
          }
        }
      } catch (error) {
        testSuccess = false;
        testError = error.message;
      }

      // If this is just a test connection request (not a save), return the test result
      if (data.testOnly) {
        if (testSuccess) {
          return handleCORS(NextResponse.json({ 
            success: true, 
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} connection test successful!` 
          }))
        } else {
          return handleCORS(NextResponse.json(
            { error: `Connection test failed: ${testError}` }, 
            { status: 400 }
          ))
        }
      }

      // If test failed and this is a save request, return error
      if (!testSuccess) {
        return handleCORS(NextResponse.json(
          { error: `Integration test failed: ${testError}` }, 
          { status: 400 }
        ))
      }

      // Save integration with merged data
      await db.collection('integrations').updateOne(
        { userId: 'default' },
        { 
          $set: { 
            [`${type}`]: mergedData,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )

      // Automatically setup Shopify webhooks when Shopify integration is saved
      if (type === 'shopify' && mergedData.shopDomain && mergedData.accessToken) {
        try {
          const webhookUrl = `${config.app.baseUrl}/api/webhook/shopify`
          
          // Create webhooks for order creation and status updates
          const webhooks = [
            { topic: 'orders/create', address: webhookUrl },
            { topic: 'orders/updated', address: webhookUrl },
            { topic: 'orders/paid', address: webhookUrl },
            { topic: 'orders/fulfilled', address: webhookUrl },
            { topic: 'orders/cancelled', address: webhookUrl },
            // Add customer webhooks to capture phone numbers
            { topic: 'customers/create', address: webhookUrl },
            { topic: 'customers/update', address: webhookUrl }
          ];
          
          const createdWebhooks = [];
          
          for (const webhook of webhooks) {
            try {
              const createdWebhook = await createShopifyWebhook(
                mergedData.shopDomain,
                mergedData.accessToken,
                webhook.topic,
                webhook.address
              );
              
              createdWebhooks.push({
                webhookId: createdWebhook.id,
                topic: webhook.topic,
                address: webhook.address
              });
            } catch (error) {
              logger.error(`Failed to create webhook for ${webhook.topic}:`, error.message);
              // Continue with other webhooks even if one fails
            }
          }

          // Save webhook info
          await db.collection('webhooks').updateOne(
            { userId: 'default', type: 'shopify' },
            { 
              $set: { 
                webhooks: createdWebhooks,
                createdAt: new Date()
              }
            },
            { upsert: true }
          );
        } catch (error) {
          logger.error('Failed to auto-setup Shopify webhooks:', error.message);
          // Don't fail the integration save if webhook setup fails
        }
      }

      return handleCORS(NextResponse.json({ success: true }), request)
    }

    // Test integrations endpoint
    if (route === '/integrations/test' && method === 'POST') {
      const body = await request.json();
      const { type, data } = body

      if (!type || !data) {
        return handleCORS(NextResponse.json(
          { error: "Type and data are required" }, 
          { status: 400 }
        ), request)
      }

      // Test the integration
      try {
        if (type === 'whatsapp' && data.phoneNumberId && data.accessToken) {
          // Test WhatsApp connection by getting phone number info
          const testUrl = `${config.whatsapp.baseUrl}/${config.whatsapp.apiVersion}/${data.phoneNumberId}`
          const testResponse = await fetch(testUrl, {
            headers: { 'Authorization': `Bearer ${data.accessToken}` }
          })
          if (!testResponse.ok) {
            const errorData = await testResponse.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || 'Invalid WhatsApp credentials');
          }
          return handleCORS(NextResponse.json({ 
            success: true, 
            message: 'WhatsApp connection test successful!' 
          }), request)
        }

        if (type === 'shopify' && data.shopDomain && data.accessToken) {
          // Test Shopify connection
          await fetchShopifyProducts(data.shopDomain, data.accessToken)
          return handleCORS(NextResponse.json({ 
            success: true, 
            message: 'Shopify connection test successful!' 
          }), request)
        }

        if (type === 'stripe' && data.secretKey) {
          // Test Stripe connection (placeholder)
          if (!data.secretKey.startsWith('sk_')) {
            throw new Error('Invalid Stripe secret key format');
          }
          return handleCORS(NextResponse.json({ 
            success: true, 
            message: 'Stripe connection test successful!' 
          }), request)
        }
        
        return handleCORS(NextResponse.json(
          { error: "Insufficient data to test connection" }, 
          { status: 400 }
        ), request)
      } catch (error) {
        logger.error(`Failed to test ${type} connection:`, error);
        return handleCORS(NextResponse.json(
          { error: `Connection test failed: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Setup webhooks endpoint
    if (route === '/setup-webhooks' && method === 'POST') {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      
      if (!integrations?.shopify?.shopDomain || !integrations?.shopify?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "Shopify not configured" }, 
          { status: 400 }
        ))
      }

      try {
        const webhookUrl = `${config.app.baseUrl}/api/webhook/shopify`
        
        // Create webhooks for order creation and status updates
        const webhooks = [
          { topic: 'orders/create', address: webhookUrl },
          { topic: 'orders/updated', address: webhookUrl },
          { topic: 'orders/paid', address: webhookUrl },
          { topic: 'orders/fulfilled', address: webhookUrl },
          { topic: 'orders/cancelled', address: webhookUrl },
          // Add customer webhooks to capture phone numbers
          { topic: 'customers/create', address: webhookUrl },
          { topic: 'customers/update', address: webhookUrl }
        ];
        
        const createdWebhooks = [];
        
        for (const webhook of webhooks) {
          try {
            const createdWebhook = await createShopifyWebhook(
              integrations.shopify.shopDomain,
              integrations.shopify.accessToken,
              webhook.topic,
              webhook.address
            );
            
            createdWebhooks.push({
              webhookId: createdWebhook.id,
              topic: webhook.topic,
              address: webhook.address
            });
          } catch (error) {
            logger.error(`Failed to create webhook for ${webhook.topic}:`, error.message);
            // Continue with other webhooks even if one fails
          }
        }

        // Save webhook info
        await db.collection('webhooks').updateOne(
          { userId: 'default', type: 'shopify' },
          { 
            $set: { 
              webhooks: createdWebhooks,
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        return handleCORS(NextResponse.json({ success: true }), request)
      } catch (error) {
        logger.error('Failed to setup webhooks:', error.message);
        return handleCORS(NextResponse.json(
          { error: `Failed to setup webhooks: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Shopify Webhook endpoint
    if (route === '/webhook/shopify' && method === 'POST') {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      
      if (!integrations?.shopify?.shopDomain || !integrations?.shopify?.accessToken) {
        logger.error('Shopify not configured for webhook processing');
        return handleCORS(NextResponse.json(
          { error: "Shopify not configured" }, 
          { status: 400 }
        ), request)
      }
      
      if (!integrations?.whatsapp?.phoneNumberId || !integrations?.whatsapp?.accessToken) {
        logger.error('WhatsApp not configured for webhook processing');
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      // Use the modular Shopify webhook handler
      try {
        // Create a mock request object for our handler
        const mockReq = {
          headers: Object.fromEntries(request.headers),
          body: await request.json(),
          method: 'POST'
        };
        
        // Create a response collector
        let responseCollector = null;
        
        // Create a mock response object
        const mockRes = {
          status: (code) => {
            return {
              json: (data) => {
                // Create and store the response
                responseCollector = handleCORS(NextResponse.json(data, { status: code }), request);
                return responseCollector;
              }
            };
          }
        };
        
        // Call the handler
        await handleShopifyWebhook(mockReq, mockRes, db, integrations);
        
        // Return the collected response
        return responseCollector || handleCORS(NextResponse.json({ success: true }, { status: 200 }), request);
      } catch (error) {
        logger.error('Error in Shopify webhook handler:', error);
        return handleCORS(NextResponse.json(
          { error: 'Internal server error' }, 
          { status: 500 }
        ), request);
      }
    }

    // WhatsApp Webhook endpoint for receiving messages
    if (route === '/webhook/whatsapp' && (method === 'POST' || method === 'GET')) {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      
      if (!integrations?.whatsapp?.phoneNumberId || !integrations?.whatsapp?.accessToken) {
        logger.error('WhatsApp not configured for webhook processing');
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      // Use the modular WhatsApp webhook handler
      try {
        // Create a mock request object for our handler
        const mockReq = {
          query: Object.fromEntries(new URL(request.url).searchParams),
          body: method === 'POST' ? await request.json() : {},
          method: method
        };
        
        // Create a response collector
        let responseCollector = null;
        
        // Create a mock response object
        const mockRes = {
          status: (code) => {
            if (code === 200 && mockReq.query?.['hub.challenge']) {
              // For verification, return the challenge directly
              responseCollector = new NextResponse(mockReq.query['hub.challenge'], { status: code });
              return {
                send: (data) => {
                  responseCollector = new NextResponse(data, { status: code });
                  return responseCollector;
                }
              };
            }
            return {
              json: (data) => {
                // Create and store the response
                responseCollector = handleCORS(NextResponse.json(data, { status: code }), request);
                return responseCollector;
              }
            };
          }
        };
        
        // Call the handler
        await handleWhatsAppWebhook.handleWhatsAppWebhook(mockReq, mockRes, db, integrations);
        
        // Return the collected response
        return responseCollector || handleCORS(NextResponse.json({ success: true }, { status: 200 }), request);
      } catch (error) {
        logger.error('Error in WhatsApp webhook handler:', error);
        return handleCORS(NextResponse.json(
          { error: 'Internal server error' }, 
          { status: 500 }
        ), request);
      }
    }

    // Messages endpoints
    if (route === '/messages' && method === 'GET') {
      const messages = await db.collection('messages').find({ userId: 'default' }).toArray()
      return handleCORS(NextResponse.json(messages), request)
    }

    if (route === '/messages' && method === 'POST') {
      const body = await request.json();
      const { to, message } = body

      if (!to || !message) {
        return handleCORS(NextResponse.json(
          { error: "To and message are required" }, 
          { status: 400 }
        ), request)
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { whatsapp } = integrations;

      if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      const messageData = {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ''),
        type: "text",
        text: {
          body: message
        }
      }

      logger.debug(`Sending message to ${to}...`);
      try {
        const result = await sendWhatsAppMessage(
          whatsapp.phoneNumberId,
          whatsapp.accessToken,
          to,
          messageData
        )
        logger.debug(`Message sent successfully to ${to}:`, result);

        // Save message to database
        await saveOutgoingMessage(db, to, message, result);

        return handleCORS(NextResponse.json(result), request)
      } catch (error) {
        logger.error(`Failed to send message to ${to}:`, error.message);
        
        // Provide more specific error message for token expiration
        let errorMessage = error.message;
        let statusCode = 500;
        
        if (error.message.includes('190') || error.message.includes('access token has expired')) {
          errorMessage = `WhatsApp access token has expired. Please refresh your token in the integration settings. Original error: ${error.message}`;
          statusCode = 401; // Unauthorized
        } else if (error.message.includes('131030') || error.message.includes('allowed list')) {
          errorMessage = `Recipient phone number not in allowed list. The customer needs to send a message to your WhatsApp Business number first to opt-in. Original error: ${error.message}`;
          statusCode = 403; // Forbidden
        }
        
        return handleCORS(NextResponse.json(
          { error: errorMessage }, 
          { status: statusCode }
        ), request);

      }
    }

    // Chats endpoints
    if (route === '/chats' && method === 'GET') {
      const chats = await db.collection('chats').find({ userId: 'default' }).toArray()
      return handleCORS(NextResponse.json(chats), request)
    }

    // Get messages for a specific chat by phone number
    if (route.startsWith('/chats/') && route.endsWith('/messages') && method === 'GET') {
      // Extract phone number from route: /chats/+1234567890/messages
      const phone = route.split('/')[2];
      
      if (!phone) {
        return handleCORS(NextResponse.json(
          { error: "Phone number is required" }, 
          { status: 400 }
        ))
      }
      
      // Find messages for this phone number, sorted by timestamp
      const messages = await db.collection('messages')
        .find({ phone: phone })
        .sort({ timestamp: 1 })
        .toArray();
      
      return handleCORS(NextResponse.json(messages), request);
    }

    if (route === '/chats' && method === 'POST') {
      const body = await request.json();
      const { phone, message } = body

      if (!phone || !message) {
        return handleCORS(NextResponse.json(
          { error: "Phone and message are required" }, 
          { status: 400 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { whatsapp } = integrations;

      if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      const messageData = {
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ''),
        type: "text",
        text: {
          body: message
        }
      }

      logger.debug(`Sending message to ${phone}...`);
      try {
        const result = await sendWhatsAppMessage(
          whatsapp.phoneNumberId,
          whatsapp.accessToken,
          phone,
          messageData
        )
        logger.debug(`Message sent successfully to ${phone}:`, result);

        // Save message to database
        await saveOutgoingMessage(db, phone, message, result);

        return handleCORS(NextResponse.json(result), request)
      } catch (error) {
        logger.error(`Failed to send message to ${phone}:`, error.message);
        
        // Provide more specific error message for token expiration
        let errorMessage = error.message;
        let statusCode = 500;
        
        if (error.message.includes('190') || error.message.includes('access token has expired')) {
          errorMessage = `WhatsApp access token has expired. Please refresh your token in the integration settings. Original error: ${error.message}`;
          statusCode = 401; // Unauthorized
        } else if (error.message.includes('131030') || error.message.includes('allowed list')) {
          errorMessage = `Recipient phone number not in allowed list. The customer needs to send a message to your WhatsApp Business number first to opt-in. Original error: ${error.message}`;
          statusCode = 403; // Forbidden
        }
        
        return handleCORS(NextResponse.json(
          { error: errorMessage }, 
          { status: statusCode }
        ))
      }
    }

    // Orders endpoints
    if (route === '/orders' && method === 'GET') {
      const orders = await db.collection('orders').find({ userId: 'default' }).toArray()
      return handleCORS(NextResponse.json(orders), request)
    }

    if (route === '/orders' && method === 'POST') {
      const body = await request.json();
      const { shopifyOrderId } = body

      if (!shopifyOrderId) {
        return handleCORS(NextResponse.json(
          { error: "Shopify order ID is required" }, 
          { status: 400 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { shopify } = integrations;

      if (!shopify?.shopDomain || !shopify?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "Shopify not configured" }, 
          { status: 400 }
        ))
      }

      const order = await fetchCompleteShopifyOrder(shopify.shopDomain, shopify.accessToken, shopifyOrderId);

      // Save order to database
      await db.collection('orders').updateOne(
        { shopifyOrderId: order.id.toString() },
        { 
          $set: { 
            id: `shopify-${order.id}`,
            userId: 'default',
            shopifyOrderId: order.id.toString(),
            orderNumber: order.order_number,
            customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
            customerEmail: order.customer?.email,
            customerPhone: order.customer?.phone,
            total: order.total_price,
            currency: order.currency,
            status: order.financial_status,
            lineItems: order.line_items || [],
            createdAt: new Date(order.created_at),
            updatedAt: new Date(order.updated_at || order.created_at)
          }
        },
        { upsert: true }
      );

      logger.debug(`Saved order ${order.id} to database`);

      return handleCORS(NextResponse.json(order), request)
    }

    // Products endpoint
    if (route === '/products' && method === 'GET') {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      
      // First, try to get products from database
      const dbProducts = await db.collection('products').find({ userId: 'default' }).toArray();
      
      // If we have products in the database, return them
      if (dbProducts.length > 0) {
        return handleCORS(NextResponse.json(dbProducts), request);
      }
      
      // If no products in database, try to fetch from Shopify if configured
      if (integrations?.shopify?.shopDomain && integrations?.shopify?.accessToken) {
        try {
          const products = await fetchShopifyProducts(
            integrations.shopify.shopDomain,
            integrations.shopify.accessToken
          );
          
          // Cache products in database
          if (products.length > 0) {
            // Clear existing products
            await db.collection('products').deleteMany({ userId: 'default' });
            
            // Insert new products with userId
            const productsWithUserId = products.map(product => ({
              ...product,
              userId: 'default'
            }));
            
            await db.collection('products').insertMany(productsWithUserId);
          }
          
          return handleCORS(NextResponse.json(products), request);
        } catch (error) {
          logger.error('Failed to fetch products from Shopify:', error);
          // Return empty array if Shopify fetch fails
          return handleCORS(NextResponse.json([]), request);
        }
      }
      
      // If Shopify not configured, return empty array
      return handleCORS(NextResponse.json([]), request);
    }

    if (route === '/products' && method === 'POST') {
      const body = await request.json();
      const { shopifyProductId } = body;

      if (!shopifyProductId) {
        return handleCORS(NextResponse.json(
          { error: "Shopify Product ID is required" }, 
          { status: 400 }
        ))
      }

      try {
        const integrations = await db.collection('integrations').findOne({ userId: 'default' });
        
        if (!integrations?.shopify?.shopDomain || !integrations?.shopify?.accessToken) {
          return handleCORS(NextResponse.json(
            { error: "Shopify not configured" }, 
            { status: 400 }
          ))
        }

        const product = await fetchShopifyProducts(
          integrations.shopify.shopDomain,
          integrations.shopify.accessToken
        ).then(products => products.find(p => p.id === shopifyProductId));

        if (!product) {
          return handleCORS(NextResponse.json(
            { error: "Product not found" }, 
            { status: 404 }
          ))
        }

        await db.collection('products').updateOne(
          { id: product.id },
          { 
            $set: { 
              userId: 'default',
              id: product.id,
              title: product.title,
              description: product.description,
              price: product.price,
              image: product.image,
              handle: product.handle
            }
          },
          { upsert: true }
        );

        return handleCORS(NextResponse.json(product), request)
      } catch (error) {
        return handleCORS(NextResponse.json(
          { error: `Failed to fetch product: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Draft orders endpoints
    if (route === '/draft-orders' && method === 'POST') {
      const body = await request.json();
      const { shopifyOrderId } = body

      if (!shopifyOrderId) {
        return handleCORS(NextResponse.json(
          { error: "Shopify order ID is required" }, 
          { status: 400 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { shopify } = integrations;

      if (!shopify?.shopDomain || !shopify?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "Shopify not configured" }, 
          { status: 400 }
        ))
      }

      const order = await fetchCompleteShopifyOrder(shopify.shopDomain, shopify.accessToken, shopifyOrderId);

      // Create draft order data
      const draftOrderData = {
        line_items: order.line_items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        })),
      }

      try {
        const draftOrder = await createShopifyDraftOrder(shopify.shopDomain, shopify.accessToken, draftOrderData);
        return handleCORS(NextResponse.json(draftOrder), request)
      } catch (error) {
        logger.error('Failed to create draft order:', error.message);
        return handleCORS(NextResponse.json(
          { error: `Failed to create draft order: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Send invoice for draft order
    if (route === '/draft-orders/:draftOrderId/send-invoice' && method === 'POST') {
      // This route pattern doesn't match our dynamic routing, so we'll skip it
      // In a real implementation, you'd need to extract the draftOrderId from the path
    }

    // Campaigns endpoints
    if (route === '/campaigns' && method === 'GET') {
      const campaigns = await db.collection('campaigns').find({ userId: 'default' }).toArray()
      return handleCORS(NextResponse.json(campaigns), request)
    }

    if (route === '/campaigns' && method === 'POST') {
      const body = await request.json();
      const { message, audience, recipients } = body

      if (!message || !audience) {
        return handleCORS(NextResponse.json(
          { error: "Message and audience are required" }, 
          { status: 400 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { whatsapp } = integrations;

      if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      const campaign = {
        id: uuidv4(),
        userId: 'default',
        message,
        audience,
        recipients,
        sentAt: new Date()
      }

      // Save campaign to database
      await db.collection('campaigns').insertOne(campaign);

      logger.debug(`Saved campaign ${campaign.id}`);

      // Send campaign to recipients
      const results = await sendCampaignToRecipients(campaign, integrations, db);

      logger.debug(`Sent campaign ${campaign.id} to ${results.length} recipients`);

      return handleCORS(NextResponse.json(results), request)
    }

    // Stripe checkout session endpoint
    if (route === '/stripe/checkout-session' && method === 'POST') {
      const body = await request.json();
      const { lineItems, metadata } = body

      if (!lineItems) {
        return handleCORS(NextResponse.json(
          { error: "Line items are required" }, 
          { status: 400 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { stripe } = integrations;

      if (!stripe?.secretKey) {
        return handleCORS(NextResponse.json(
          { error: "Stripe not configured" }, 
          { status: 400 }
        ))
      }

      const checkoutSession = await createStripeCheckoutSession(lineItems, metadata);

      logger.debug(`Created Stripe checkout session ${checkoutSession.id}`);

      return handleCORS(NextResponse.json(checkoutSession), request)
    }

    // Handle /api/send-whatsapp-message route for sending messages
    if (route === '/send-whatsapp-message' && method === 'POST') {
      const body = await request.json();
      const { to, message } = body

      if (!to || !message) {
        return handleCORS(NextResponse.json(
          { error: "To and message are required" }, 
          { status: 400 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { whatsapp } = integrations;

      if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      const messageData = {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ''),
        type: "text",
        text: {
          body: message
        }
      }

      logger.debug(`Sending message to ${to}...`);
      try {
        const result = await sendWhatsAppMessage(
          whatsapp.phoneNumberId,
          whatsapp.accessToken,
          to,
          messageData
        )
        logger.debug(`Message sent successfully to ${to}:`, result);

        // Save message to database
        const savedMessage = await saveOutgoingMessage(db, to, message, result);

        // Return the saved message along with the API response
        return handleCORS(NextResponse.json({
          ...result,
          message: savedMessage
        }))
      } catch (error) {
        logger.error(`Failed to send message to ${to}:`, error.message);
        
        // Provide more specific error message for token expiration
        let errorMessage = error.message;
        let statusCode = 500;
        
        if (error.message.includes('190') || error.message.includes('access token has expired')) {
          errorMessage = `WhatsApp access token has expired. Please refresh your token in the integration settings. Original error: ${error.message}`;
          statusCode = 401; // Unauthorized
        } else if (error.message.includes('131030') || error.message.includes('allowed list')) {
          errorMessage = `Recipient phone number not in allowed list. The customer needs to send a message to your WhatsApp Business number first to opt-in. Original error: ${error.message}`;
          statusCode = 403; // Forbidden
        }
        
        return handleCORS(NextResponse.json(
          { error: errorMessage }, 
          { status: statusCode }
        ))
      }
    }

    // Handle /api/send-catalog route for sending product catalogs
    if (route === '/send-catalog' && method === 'POST') {
      const body = await request.json();
      const { products, recipient } = body;

      if (!products || !Array.isArray(products) || products.length === 0) {
        return handleCORS(NextResponse.json(
          { error: "Products array is required and cannot be empty" }, 
          { status: 400 }
        ))
      }

      if (!recipient) {
        return handleCORS(NextResponse.json(
          { error: "Recipient is required" }, 
          { status: 400 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' });
      const { whatsapp } = integrations;

      if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      // Format products for WhatsApp catalog message
      let catalogMessage = "🛍️ *Product Catalog*\n\n";
      products.forEach((product, index) => {
        catalogMessage += `${index + 1}. *${product.title}*\n`;
        catalogMessage += `   Price: $${product.price}\n`;
        if (product.description) {
          catalogMessage += `   Description: ${product.description}\n`;
        }
        catalogMessage += "\n";
      });

      catalogMessage += "Please let me know if you'd like to order any of these products!";

      const messageData = {
        messaging_product: "whatsapp",
        to: recipient.replace(/\D/g, ''),
        type: "text",
        text: {
          body: catalogMessage
        }
      }

      logger.debug(`Sending catalog to ${recipient}...`);
      try {
        const result = await sendWhatsAppMessage(
          whatsapp.phoneNumberId,
          whatsapp.accessToken,
          recipient,
          messageData
        )
        logger.debug(`Catalog sent successfully to ${recipient}:`, result);

        // Save message to database
        const savedMessage = await saveOutgoingMessage(db, recipient, catalogMessage, result);

        // Return the saved message along with the API response
        return handleCORS(NextResponse.json({
          ...result,
          message: savedMessage
        }))
      } catch (error) {
        logger.error(`Failed to send catalog to ${recipient}:`, error.message);
        
        // Provide more specific error message for token expiration
        let errorMessage = error.message;
        let statusCode = 500;
        
        if (error.message.includes('190') || error.message.includes('access token has expired')) {
          errorMessage = `WhatsApp access token has expired. Please refresh your token in the integration settings. Original error: ${error.message}`;
          statusCode = 401; // Unauthorized
        } else if (error.message.includes('131030') || error.message.includes('allowed list')) {
          errorMessage = `Recipient phone number not in allowed list. The customer needs to send a message to your WhatsApp Business number first to opt-in. Original error: ${error.message}`;
          statusCode = 403; // Forbidden
        }
        
        return handleCORS(NextResponse.json(
          { error: errorMessage }, 
          { status: statusCode }
        ))
      }
    }

    // Handle /api/whatsapp-checkout route for Shopify WhatsApp checkout
    if (route === '/whatsapp-checkout' && method === 'POST') {
      try {
        const body = await request.json();
        const { customerPhone, cartItems, customerInfo } = body;

        logger.debug('WhatsApp checkout request received:', { customerPhone, cartItems, customerInfo });

        if (!customerPhone) {
          logger.warn('Customer phone number is required for WhatsApp checkout');
          return handleCORS(NextResponse.json(
            { error: "Customer phone number is required" }, 
            { status: 400 }
          ), request)
        }

        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
          logger.warn('Cart items are required for WhatsApp checkout');
          return handleCORS(NextResponse.json(
            { error: "Cart items are required" }, 
            { status: 400 }
          ), request)
        }

        const integrations = await db.collection('integrations').findOne({ userId: 'default' });
        
        if (!integrations) {
          logger.error('No integrations found for user');
          return handleCORS(NextResponse.json(
            { error: "No integrations configured" }, 
            { status: 400 }
          ), request)
        }

        const { whatsapp, shopify } = integrations;

        if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
          logger.error('WhatsApp not properly configured', { phoneNumberId: whatsapp?.phoneNumberId, accessToken: !!whatsapp?.accessToken });
          return handleCORS(NextResponse.json(
            { error: "WhatsApp not configured" }, 
            { status: 400 }
          ), request)
        }

        if (!shopify?.shopDomain || !shopify?.accessToken) {
          logger.error('Shopify not properly configured', { shopDomain: shopify?.shopDomain, accessToken: !!shopify?.accessToken });
          return handleCORS(NextResponse.json(
            { error: "Shopify not configured" }, 
            { status: 400 }
          ), request)
        }

        // Log the integration details (without sensitive data)
        logger.debug('Processing checkout with integrations:', {
          whatsappConfigured: !!(whatsapp?.phoneNumberId && whatsapp?.accessToken),
          shopifyConfigured: !!(shopify?.shopDomain && shopify?.accessToken),
          shopDomain: shopify?.shopDomain
        });

        // Format cart items for the initial message
        const cartSummary = cartItems.map(item => 
          `• ${item.title} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
        ).join('\n');
        
        const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);

        // Instead of immediately creating a draft order, start the WhatsApp automation flow
        // Save the cart data for later use in the automation
        const cartData = {
          customerPhone: customerPhone.replace(/\D/g, ''),
          cartItems,
          customerInfo: customerInfo || {},
          createdAt: new Date(),
          status: 'pending_whatsapp_confirmation'
        };

        // Save cart data to database for later retrieval
        await db.collection('pending_whatsapp_checkouts').insertOne(cartData);

        // Send initial message to customer to start the automation flow
        const initialMessage = `🛍️ *WhatsApp Checkout*

Hello! I'd like to checkout my order.

Order Summary:
${cartSummary}

Total: $${cartTotal}

Please reply with your full name to proceed with the order:`;

        const messageData = {
          messaging_product: "whatsapp",
          to: customerPhone.replace(/\D/g, ''),
          type: "text",
          text: {
            body: initialMessage
          }
        };

        logger.debug(`Sending initial checkout message to ${customerPhone}...`);
        const result = await sendWhatsAppMessage(
          whatsapp.phoneNumberId,
          whatsapp.accessToken,
          customerPhone,
          messageData
        );
        logger.debug(`Initial checkout message sent successfully to ${customerPhone}:`, result);

        // Save message to database
        await saveOutgoingMessage(db, customerPhone, initialMessage, result);

        // Return success response
        return handleCORS(NextResponse.json({
          success: true,
          message: 'Checkout process initiated. Customer will be contacted via WhatsApp to collect information.'
        }));

      } catch (error) {
        logger.error('Error processing WhatsApp checkout:', error);
        // Provide more specific error message for the "not in allowed list" error
        let errorMessage = error.message;
        let statusCode = 500;
        
        if (error.message.includes('190') || error.message.includes('access token has expired')) {
          errorMessage = `WhatsApp access token has expired. Please refresh your token in the integration settings. Original error: ${error.message}`;
          statusCode = 401; // Unauthorized
        } else if (error.message.includes('131030') || error.message.includes('allowed list')) {
          errorMessage = `Failed to process checkout: ${error.message}. To fix this issue: 1) Ask the customer to send any message to your WhatsApp Business number first to opt-in, 2) Then try the checkout again.`;
          statusCode = 403; // Forbidden
        }
        
        return handleCORS(NextResponse.json(
          { error: errorMessage }, 
          { status: statusCode }
        ));
      }
    }

    // Fallback for unknown routes
    return handleCORS(NextResponse.json(
      { error: "Route not found" }, 
      { status: 404 }
    ), request)

  } catch (error) {
    logger.error('Error processing request:', error.message);
    return handleCORS(NextResponse.json(
      { error: `Error processing request: ${error.message}` }, 
      { status: 500 }
    ), request)
  }
}

// Export all HTTP methods
export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
