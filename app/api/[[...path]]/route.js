import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// WhatsApp API functions
async function sendWhatsAppMessage(phoneNumberId, accessToken, to, messageData) {
  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`
  
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
    throw new Error(data.error?.message || 'WhatsApp API error')
  }
  
  return data
}

// Shopify API functions
async function fetchShopifyProducts(shopDomain, accessToken) {
  const url = `https://${shopDomain}/admin/api/2023-10/products.json`
  
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.errors || 'Shopify API error')
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

async function createShopifyWebhook(shopDomain, accessToken, topic, webhookUrl) {
  const url = `https://${shopDomain}/admin/api/2023-10/webhooks.json`
  
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
    throw new Error(data.errors || 'Shopify webhook creation error')
  }
  
  return data.webhook
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

      const result = await sendWhatsAppMessage(
        whatsapp.phoneNumberId,
        whatsapp.accessToken,
        recipient,
        messageData
      )

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
      results.push({
        recipient,
        success: false,
        error: error.message
      })
    }
  }

  return results
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "WhatsApp Commerce Hub API" }))
    }

    // Integrations endpoints
    if (route === '/integrations' && method === 'GET') {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' })
      
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
          businessAccountId: integrations.whatsapp?.businessAccountId || ''
        }
        defaultIntegrations.shopify.data = {
          shopDomain: integrations.shopify?.shopDomain || '',
          apiKey: integrations.shopify?.apiKey || ''
        }
        defaultIntegrations.stripe.data = {
          publishableKey: integrations.stripe?.publishableKey || ''
        }
      }

      return handleCORS(NextResponse.json(defaultIntegrations))
    }

    if (route === '/integrations' && method === 'POST') {
      const body = await request.json()
      const { type, data } = body

      if (!type || !data) {
        return handleCORS(NextResponse.json(
          { error: "Type and data are required" }, 
          { status: 400 }
        ))
      }

      // Test the integration before saving
      try {
        if (type === 'whatsapp' && data.phoneNumberId && data.accessToken) {
          // Test WhatsApp connection by getting phone number info
          const testUrl = `https://graph.facebook.com/v17.0/${data.phoneNumberId}`
          const testResponse = await fetch(testUrl, {
            headers: { 'Authorization': `Bearer ${data.accessToken}` }
          })
          if (!testResponse.ok) {
            throw new Error('Invalid WhatsApp credentials')
          }
        }

        if (type === 'shopify' && data.shopDomain && data.accessToken) {
          // Test Shopify connection
          await fetchShopifyProducts(data.shopDomain, data.accessToken)
        }

        if (type === 'stripe' && data.secretKey) {
          // Test Stripe connection (placeholder)
          if (!data.secretKey.startsWith('sk_')) {
            throw new Error('Invalid Stripe secret key format')
          }
        }
      } catch (error) {
        return handleCORS(NextResponse.json(
          { error: `Integration test failed: ${error.message}` }, 
          { status: 400 }
        ))
      }

      // Save integration
      await db.collection('integrations').updateOne(
        { userId: 'default' },
        { 
          $set: { 
            [`${type}`]: data,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // Setup webhooks endpoint
    if (route === '/setup-webhooks' && method === 'POST') {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' })
      
      if (!integrations?.shopify?.shopDomain || !integrations?.shopify?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "Shopify not configured" }, 
          { status: 400 }
        ))
      }

      try {
        const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/shopify`
        
        // Create webhook for order creation
        const webhook = await createShopifyWebhook(
          integrations.shopify.shopDomain,
          integrations.shopify.accessToken,
          'orders/create',
          webhookUrl
        )

        // Save webhook info
        await db.collection('webhooks').updateOne(
          { userId: 'default', type: 'shopify' },
          { 
            $set: { 
              webhookId: webhook.id,
              topic: 'orders/create',
              address: webhookUrl,
              createdAt: new Date()
            }
          },
          { upsert: true }
        )

        return handleCORS(NextResponse.json({ 
          success: true, 
          webhookId: webhook.id 
        }))
      } catch (error) {
        return handleCORS(NextResponse.json(
          { error: `Failed to setup webhook: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Products endpoint
    if (route === '/products' && method === 'GET') {
      const integrations = await db.collection('integrations').findOne({ userId: 'default' })
      
      if (!integrations?.shopify?.shopDomain || !integrations?.shopify?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "Shopify not configured" }, 
          { status: 400 }
        ))
      }

      try {
        const products = await fetchShopifyProducts(
          integrations.shopify.shopDomain,
          integrations.shopify.accessToken
        )
        
        // Cache products in database
        await db.collection('products').updateOne(
          { userId: 'default' },
          { 
            $set: { 
              products,
              lastSync: new Date()
            }
          },
          { upsert: true }
        )

        return handleCORS(NextResponse.json(products))
      } catch (error) {
        return handleCORS(NextResponse.json(
          { error: `Failed to fetch products: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Campaigns endpoints
    if (route === '/campaigns' && method === 'GET') {
      const campaigns = await db.collection('campaigns')
        .find({ userId: 'default' })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      const cleanedCampaigns = campaigns.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedCampaigns))
    }

    if (route === '/campaigns' && method === 'POST') {
      const body = await request.json()
      
      if (!body.name || !body.message) {
        return handleCORS(NextResponse.json(
          { error: "Campaign name and message are required" }, 
          { status: 400 }
        ))
      }

      const campaign = {
        id: uuidv4(),
        userId: 'default',
        name: body.name,
        message: body.message,
        audience: body.audience || 'all_customers',
        recipients: body.recipients || [],
        status: body.status || 'draft',
        createdAt: new Date()
      }

      await db.collection('campaigns').insertOne(campaign)
      
      const { _id, ...cleanedCampaign } = campaign
      return handleCORS(NextResponse.json(cleanedCampaign))
    }

    // Send campaign endpoint
    if (route.startsWith('/campaigns/') && route.endsWith('/send') && method === 'POST') {
      const campaignId = route.split('/')[2]
      
      const campaign = await db.collection('campaigns').findOne({ 
        id: campaignId, 
        userId: 'default' 
      })
      
      if (!campaign) {
        return handleCORS(NextResponse.json(
          { error: "Campaign not found" }, 
          { status: 404 }
        ))
      }

      const integrations = await db.collection('integrations').findOne({ userId: 'default' })
      
      if (!integrations?.whatsapp?.phoneNumberId || !integrations?.whatsapp?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      try {
        const results = await sendCampaignToRecipients(campaign, integrations, db)
        
        // Update campaign status
        await db.collection('campaigns').updateOne(
          { id: campaignId },
          { 
            $set: { 
              status: 'sent',
              sentAt: new Date(),
              results: results
            }
          }
        )

        return handleCORS(NextResponse.json({ 
          success: true, 
          results: results 
        }))

      } catch (error) {
        // Update campaign status to failed
        await db.collection('campaigns').updateOne(
          { id: campaignId },
          { 
            $set: { 
              status: 'failed',
              error: error.message,
              failedAt: new Date()
            }
          }
        )

        return handleCORS(NextResponse.json(
          { error: `Failed to send campaign: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Delete campaign endpoint
    if (route.startsWith('/campaigns/') && method === 'DELETE') {
      const campaignId = route.split('/')[2]
      
      const result = await db.collection('campaigns').deleteOne({ 
        id: campaignId, 
        userId: 'default' 
      })
      
      if (result.deletedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Campaign not found" }, 
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // Orders endpoint
    if (route === '/orders' && method === 'GET') {
      const orders = await db.collection('orders')
        .find({ userId: 'default' })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      const cleanedOrders = orders.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedOrders))
    }

    // Send catalog endpoint
    if (route === '/send-catalog' && method === 'POST') {
      const body = await request.json()
      const { products: productIds, recipient } = body

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return handleCORS(NextResponse.json(
          { error: "Products array is required" }, 
          { status: 400 }
        ))
      }

      if (!recipient) {
        return handleCORS(NextResponse.json(
          { error: "Recipient phone number is required" }, 
          { status: 400 }
        ))
      }

      // Get integrations
      const integrations = await db.collection('integrations').findOne({ userId: 'default' })
      
      if (!integrations?.whatsapp?.phoneNumberId || !integrations?.whatsapp?.accessToken) {
        return handleCORS(NextResponse.json(
          { error: "WhatsApp not configured" }, 
          { status: 400 }
        ))
      }

      // Get products
      const productsData = await db.collection('products').findOne({ userId: 'default' })
      if (!productsData) {
        return handleCORS(NextResponse.json(
          { error: "No products found. Please sync products first." }, 
          { status: 400 }
        ))
      }

      const selectedProducts = productsData.products.filter(p => productIds.includes(p.id))
      
      if (selectedProducts.length === 0) {
        return handleCORS(NextResponse.json(
          { error: "Selected products not found" }, 
          { status: 400 }
        ))
      }

      try {
        // Create catalog message
        let catalogText = "🛍️ *Product Catalog*\n\n"
        
        for (const product of selectedProducts) {
          catalogText += `*${product.title}*\n`
          if (product.description) {
            catalogText += `${product.description.substring(0, 100)}...\n`
          }
          catalogText += `💰 Price: $${product.price}\n`
          
          // Create Stripe checkout session for individual product
          if (integrations.stripe?.secretKey) {
            const checkoutSession = await createStripeCheckoutSession([
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: product.title,
                    description: product.description
                  },
                  unit_amount: Math.round(parseFloat(product.price) * 100)
                },
                quantity: 1
              }
            ], { productId: product.id })
            
            catalogText += `🛒 Buy now: ${checkoutSession.url}\n\n`
          } else {
            catalogText += `🛒 Contact us to purchase\n\n`
          }
        }

        const messageData = {
          messaging_product: "whatsapp",
          to: recipient.replace(/\D/g, ''), // Remove non-digits
          type: "text",
          text: {
            body: catalogText
          }
        }

        const result = await sendWhatsAppMessage(
          integrations.whatsapp.phoneNumberId,
          integrations.whatsapp.accessToken,
          recipient,
          messageData
        )

        // Log the message
        await db.collection('messages').insertOne({
          id: uuidv4(),
          userId: 'default',
          recipient,
          products: selectedProducts,
          whatsappMessageId: result.messages?.[0]?.id,
          status: 'sent',
          sentAt: new Date()
        })

        return handleCORS(NextResponse.json({ 
          success: true, 
          messageId: result.messages?.[0]?.id 
        }))

      } catch (error) {
        return handleCORS(NextResponse.json(
          { error: `Failed to send message: ${error.message}` }, 
          { status: 400 }
        ))
      }
    }

    // Webhook endpoint for WhatsApp
    if (route === '/webhook/whatsapp' && method === 'GET') {
      const verifyToken = request.nextUrl.searchParams.get('hub.verify_token')
      const challenge = request.nextUrl.searchParams.get('hub.challenge')
      
      const integrations = await db.collection('integrations').findOne({ userId: 'default' })
      const expectedToken = integrations?.whatsapp?.webhookVerifyToken
      
      if (verifyToken === expectedToken) {
        return handleCORS(new NextResponse(challenge))
      } else {
        return handleCORS(new NextResponse('Forbidden', { status: 403 }))
      }
    }

    if (route === '/webhook/whatsapp' && method === 'POST') {
      const body = await request.json()
      
      // Log webhook for debugging
      await db.collection('webhook_logs').insertOne({
        id: uuidv4(),
        type: 'whatsapp',
        payload: body,
        receivedAt: new Date()
      })
      
      return handleCORS(NextResponse.json({ success: true }))
    }

    // Webhook endpoint for Shopify
    if (route === '/webhook/shopify' && method === 'POST') {
      const body = await request.json()
      
      // Log webhook for debugging
      await db.collection('webhook_logs').insertOne({
        id: uuidv4(),
        type: 'shopify',
        payload: body,
        receivedAt: new Date()
      })

      try {
        // Process Shopify order webhook
        if (body.id && body.customer) {
          const order = {
            id: uuidv4(),
            userId: 'default',
            shopifyOrderId: body.id.toString(),
            orderNumber: body.order_number || body.name,
            customerName: `${body.customer.first_name} ${body.customer.last_name}`.trim(),
            customerEmail: body.customer.email,
            customerPhone: body.customer.phone,
            total: body.total_price,
            currency: body.currency,
            status: body.fulfillment_status || 'pending',
            lineItems: body.line_items || [],
            createdAt: new Date(body.created_at),
            whatsappSent: false
          }

          // Save order to database
          await db.collection('orders').insertOne(order)

          // Send WhatsApp confirmation to customer if phone number exists
          if (order.customerPhone) {
            const integrations = await db.collection('integrations').findOne({ userId: 'default' })
            
            if (integrations?.whatsapp?.phoneNumberId && integrations?.whatsapp?.accessToken) {
              try {
                const confirmationMessage = `🎉 *Order Confirmation*\n\n` +
                  `Thank you for your order, ${order.customerName}!\n\n` +
                  `📋 Order #${order.orderNumber}\n` +
                  `💰 Total: ${order.currency} ${order.total}\n` +
                  `📦 Status: Processing\n\n` +
                  `We'll send you updates as your order progresses. Thank you for choosing us! 🙏`

                const messageData = {
                  messaging_product: "whatsapp",
                  to: order.customerPhone.replace(/\D/g, ''),
                  type: "text",
                  text: {
                    body: confirmationMessage
                  }
                }

                const result = await sendWhatsAppMessage(
                  integrations.whatsapp.phoneNumberId,
                  integrations.whatsapp.accessToken,
                  order.customerPhone,
                  messageData
                )

                // Update order to mark WhatsApp as sent
                await db.collection('orders').updateOne(
                  { id: order.id },
                  { 
                    $set: { 
                      whatsappSent: true,
                      whatsappMessageId: result.messages?.[0]?.id,
                      whatsappSentAt: new Date()
                    }
                  }
                )

                // Log the message
                await db.collection('messages').insertOne({
                  id: uuidv4(),
                  userId: 'default',
                  orderId: order.id,
                  recipient: order.customerPhone,
                  message: confirmationMessage,
                  whatsappMessageId: result.messages?.[0]?.id,
                  status: 'sent',
                  sentAt: new Date()
                })

              } catch (whatsappError) {
                console.error('Failed to send WhatsApp confirmation:', whatsappError)
                // Don't fail the webhook if WhatsApp fails
              }
            }
          }
        }

        return handleCORS(NextResponse.json({ success: true }))
      } catch (error) {
        console.error('Shopify webhook processing error:', error)
        return handleCORS(NextResponse.json({ success: true })) // Always return success to Shopify
      }
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute