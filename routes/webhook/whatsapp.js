// WhatsApp Webhook Handler with Checkout Automation
const SessionManager = require('../../services/sessionManager');
const ShopifyClient = require('../../services/shopifyClient');
const PaymentGateway = require('../../services/paymentGateway');
const WhatsAppTemplateSender = require('../../utils/sendWhatsAppTemplate');
const config = require('../../config');
const { triggerShopifyOrderStatusAutomation } = require('../../lib/shopifyOrderAutomationTrigger');

// Conversation states
const CONVERSATION_STATES = {
  IDLE: 'idle',
  ASKING_INTENT: 'asking_intent',
  COLLECTING_CUSTOMER_INFO: 'collecting_customer_info',
  CONFIRMING_CART: 'confirming_cart',
  ASKING_PAYMENT_METHOD: 'asking_payment_method',
  PROCESSING_PAYMENT: 'processing_payment',
  ORDER_CONFIRMED: 'order_confirmed',
  // Add new state for WhatsApp checkout flow
  CHECKOUT_COLLECTING_NAME: 'checkout_collecting_name',
  CHECKOUT_COLLECTING_ADDRESS: 'checkout_collecting_address',
  CHECKOUT_COLLECTING_PINCODE: 'checkout_collecting_pincode',
  CHECKOUT_COLLECTING_EMAIL: 'checkout_collecting_email',
  CHECKOUT_CONFIRMING_ORDER: 'checkout_confirming_order',
  CHECKOUT_PROCESSING_ORDER: 'checkout_processing_order'
};

// Customer info fields
const CUSTOMER_INFO_FIELDS = [
  'firstName',
  'lastName',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'pincode',
  'email'
];

// Function to detect checkout intent
function detectCheckoutIntent(message) {
  const checkoutKeywords = [
    'checkout',
    'buy',
    'order',
    'purchase',
    'cart',
    'pay',
    'want to buy',
    'i want to order',
    'i want to buy',
    'i want to checkout',
    'i want to purchase',
    'i want to pay',
    'i would like to order',
    'i would like to buy',
    'i would like to checkout',
    'i would like to purchase',
    'i would like to pay'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  return checkoutKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to format cart items for display
function formatCartItems(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    return "No items in cart";
  }
  
  return cartItems.map(item => 
    `• ${item.title} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');
}

// Function to calculate cart total
function calculateCartTotal(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    return 0;
  }
  
  return cartItems.reduce((total, item) => 
    total + (item.price * item.quantity), 0
  ).toFixed(2);
}

// Main WhatsApp webhook handler
async function handleWhatsAppWebhook(req, res, db, integrations) {
  try {
    const body = req.body;
    
    // Handle WhatsApp webhook verification (GET request)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      
      // Check if the verification token matches
      const verifyToken = config.whatsapp.webhookVerifyToken;
      
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('WhatsApp webhook verified successfully');
        return res.status(200).send(challenge);
      } else {
        console.log('WhatsApp webhook verification failed');
        return res.status(403).json({ error: 'Verification failed' });
      }
    }
    
    // Handle incoming WhatsApp messages (POST request)
    if (req.method === 'POST') {
      console.log('Received WhatsApp webhook:', JSON.stringify(body, null, 2));
      
      // Check if this is a message notification
      if (body.object === 'whatsapp_business_account' && body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              // Handle message status updates (read/delivered/etc.)
              if (change.field === 'messages' && change.value?.statuses) {
                // Process each status update
                for (const status of change.value.statuses) {
                  try {
                    await processMessageStatus(status, change.value, db, integrations);
                  } catch (error) {
                    console.error('Error processing WhatsApp message status:', error);
                  }
                }
              }
              // Handle incoming messages
              else if (change.field === 'messages' && change.value?.messages) {
                // Process each message
                for (const message of change.value.messages) {
                  try {
                    await processIncomingMessage(message, change.value, db, integrations);
                  } catch (error) {
                    console.error('Error processing incoming WhatsApp message:', error);
                  }
                }
              }
            }
          }
        }
      }
      
      return res.status(200).json({ success: true });
    }
    
    // If we reach here, it's an unsupported method
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Process incoming WhatsApp message
async function processIncomingMessage(message, value, db, integrations) {
  try {
    // Extract sender information
    const from = message.from || value.contacts?.[0]?.wa_id;
    const timestamp = message.timestamp || value.timestamp;
    
    if (!from) {
      console.error('Could not determine sender phone number');
      return;
    }
    
    console.log(`Processing message from ${from}:`, JSON.stringify(message, null, 2));
    
    // Initialize services
    const sessionManager = new SessionManager(db);
    const whatsappSender = new WhatsAppTemplateSender(
      integrations.whatsapp.phoneNumberId,
      integrations.whatsapp.accessToken
    );
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    const paymentGateway = new PaymentGateway();
    
    // Get current session
    let session = await sessionManager.getSession(from);
    
    // If no session exists, create a new one
    if (!session) {
      session = await sessionManager.setSession(from, {
        state: CONVERSATION_STATES.IDLE,
        createdAt: new Date(),
        lastActivity: new Date()
      });
    }
    
    // Handle different message types
    if (message.type === 'text') {
      const text = message.text?.body || '';
      
      // Check if this is part of the WhatsApp checkout flow
      if (session.state && session.state.startsWith('checkout_')) {
        // Additional check to ensure we're still in a valid checkout state
        // If the customer is asking about orders, shipments, etc., exit checkout flow
        const isOrderRelatedMessage = text.toLowerCase().includes('order') || 
          text.toLowerCase().includes('status') || 
          text.toLowerCase().includes('shipment') || 
          text.toLowerCase().includes('delivery') ||
          text.toLowerCase().includes('tracking');
          
        if (isOrderRelatedMessage) {
          // Exit checkout flow and reset to idle state
          await sessionManager.setSessionState(from, CONVERSATION_STATES.IDLE);
          // Send a generic response
          await whatsappSender.sendTextMessage(from, 
            "Hello! 👋 I'm your shopping assistant. Say 'checkout' or 'buy' to start shopping, or ask me anything about our products!");
        } else {
          await handleCheckoutFlow(
            from, 
            text, 
            session, 
            sessionManager, 
            whatsappSender, 
            shopifyClient, 
            paymentGateway,
            integrations,
            db
          );
        }
      }
      // If we're in idle state, check for checkout intent
      else if (session.state === CONVERSATION_STATES.IDLE) {
        // Check if there's a pending checkout for this user
        const pendingCheckout = await db.collection('pending_whatsapp_checkouts').findOne({ 
          customerPhone: from,
          status: 'pending_whatsapp_confirmation'
        });
        
        // Only start the checkout flow automatically if:
        // 1. There is a pending checkout
        // 2. The pending checkout was created recently (within the last 5 minutes)
        // 3. The customer's message doesn't seem to be about an existing order
        if (pendingCheckout) {
          const isRecentCheckout = pendingCheckout.createdAt && 
            (new Date() - new Date(pendingCheckout.createdAt)) < 5 * 60 * 1000; // 5 minutes
          
          const isOrderRelatedMessage = text.toLowerCase().includes('order') || 
            text.toLowerCase().includes('status') || 
            text.toLowerCase().includes('shipment') || 
            text.toLowerCase().includes('delivery') ||
            text.toLowerCase().includes('tracking');
          
          // Only auto-start checkout for recent checkouts that don't seem order-related
          if (isRecentCheckout && !isOrderRelatedMessage) {
            // Start checkout flow immediately
            await startCheckoutFlow(from, session, sessionManager, whatsappSender, db);
            // After starting the checkout flow, we need to handle the new state
            // Get the updated session
            const updatedSession = await sessionManager.getSession(from);
            if (updatedSession && updatedSession.state && updatedSession.state.startsWith('checkout_')) {
              await handleCheckoutFlow(
                from, 
                text, 
                updatedSession, 
                sessionManager, 
                whatsappSender, 
                shopifyClient, 
                paymentGateway,
                integrations,
                db
              );
            }
          } else {
            // For older checkouts or order-related messages, treat as regular conversation
            if (detectCheckoutIntent(text)) {
              await handleCheckoutIntent(from, session, sessionManager, whatsappSender);
            } else {
              // Send a generic response
              await whatsappSender.sendTextMessage(from, 
                "Hello! 👋 I'm your shopping assistant. Say 'checkout' or 'buy' to start shopping, or ask me anything about our products!");
            }
          }
        } else if (detectCheckoutIntent(text)) {
          await handleCheckoutIntent(from, session, sessionManager, whatsappSender);
        } else {
          // Send a generic response
          await whatsappSender.sendTextMessage(from, 
            "Hello! 👋 I'm your shopping assistant. Say 'checkout' or 'buy' to start shopping, or ask me anything about our products!");
        }
      } 
      // Handle different conversation states
      else {
        await handleConversationState(
          from, 
          text, 
          session, 
          sessionManager, 
          whatsappSender, 
          shopifyClient, 
          paymentGateway,
          integrations
        );
      }
    } 
    // Handle button responses
    else if (message.type === 'button') {
      const buttonPayload = message.button?.payload || '';
      
      // Handle rating feedback
      if (buttonPayload.startsWith('rating_')) {
        const parts = buttonPayload.split('_');
        const orderId = parts[1];
        const rating = parts[2];
        
        await whatsappSender.sendTextMessage(from, 
          `Thank you for your ${rating}-star rating! We appreciate your feedback and hope to serve you again soon. 🙏`);
      }
    }
    // Handle other message types
    else {
      await whatsappSender.sendTextMessage(from, 
        "I can help you with shopping! Say 'checkout' or 'buy' to start shopping, or ask me anything about our products.");
    }
  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
}

// Handle checkout intent
async function handleCheckoutIntent(from, session, sessionManager, whatsappSender) {
  try {
    // Update session state
    await sessionManager.setSessionState(from, CONVERSATION_STATES.ASKING_INTENT);
    
    // Send welcome message
    await whatsappSender.sendTextMessage(from, 
      `🛍️ *Welcome to our store!*
      
I can help you place an order. To get started, could you please share your name?`);
  } catch (error) {
    console.error('Error handling checkout intent:', error);
  }
}

// Handle conversation based on state
async function handleConversationState(
  from, 
  text, 
  session, 
  sessionManager, 
  whatsappSender, 
  shopifyClient, 
  paymentGateway,
  integrations
) {
  try {
    switch (session.state) {
      case CONVERSATION_STATES.ASKING_INTENT:
        await handleAskingIntent(from, text, session, sessionManager, whatsappSender);
        break;
        
      case CONVERSATION_STATES.COLLECTING_CUSTOMER_INFO:
        await handleCollectingCustomerInfo(from, text, session, sessionManager, whatsappSender);
        break;
        
      case CONVERSATION_STATES.CONFIRMING_CART:
        await handleConfirmingCart(from, text, session, sessionManager, whatsappSender, shopifyClient);
        break;
        
      case CONVERSATION_STATES.ASKING_PAYMENT_METHOD:
        await handleAskingPaymentMethod(from, text, session, sessionManager, whatsappSender, shopifyClient, paymentGateway, integrations);
        break;
        
      case CONVERSATION_STATES.PROCESSING_PAYMENT:
        // This state is handled by payment webhooks
        break;
        
      case CONVERSATION_STATES.ORDER_CONFIRMED:
        await handleOrderConfirmed(from, text, session, sessionManager, whatsappSender);
        break;
        
      default:
        await whatsappSender.sendTextMessage(from, 
          "I'm not sure what to do next. Say 'checkout' or 'buy' to start a new order.");
        break;
    }
  } catch (error) {
    console.error('Error handling conversation state:', error);
  }
}

// Handle asking intent state
async function handleAskingIntent(from, text, session, sessionManager, whatsappSender) {
  try {
    // Save customer name
    const customerName = text.trim();
    
    // Update session with customer info
    await sessionManager.updateSession(from, {
      customerInfo: {
        name: customerName
      },
      state: CONVERSATION_STATES.COLLECTING_CUSTOMER_INFO,
      currentField: 'addressLine1'
    });
    
    // Ask for address
    await whatsappSender.sendTextMessage(from, 
      `Nice to meet you, ${customerName}! 👋
      
To proceed with your order, I'll need your delivery address. Please provide your address line 1 (house/flat number and street):`);
  } catch (error) {
    console.error('Error handling asking intent:', error);
  }
}

// Handle collecting customer info state
async function handleCollectingCustomerInfo(from, text, session, sessionManager, whatsappSender) {
  try {
    const currentField = session.currentField || 'addressLine1';
    const customerInfo = session.customerInfo || {};
    
    // Save the current field value
    customerInfo[currentField] = text.trim();
    
    // Determine next field
    let nextField = null;
    let nextFieldPrompt = '';
    
    switch (currentField) {
      case 'addressLine1':
        nextField = 'addressLine2';
        nextFieldPrompt = 'Please provide your address line 2 (street/area, if applicable):';
        break;
        
      case 'addressLine2':
        nextField = 'city';
        nextFieldPrompt = 'Please provide your city:';
        break;
        
      case 'city':
        nextField = 'state';
        nextFieldPrompt = 'Please provide your state:';
        break;
        
      case 'state':
        nextField = 'pincode';
        nextFieldPrompt = 'Please provide your pincode:';
        break;
        
      case 'pincode':
        nextField = 'email';
        nextFieldPrompt = 'Please provide your email address:';
        break;
        
      case 'email':
        // All info collected, move to cart confirmation
        await sessionManager.updateSession(from, {
          customerInfo,
          state: CONVERSATION_STATES.CONFIRMING_CART
        });
        
        // For now, we'll simulate a cart since we don't have the frontend integration
        const cartItems = [
          {
            id: '1',
            title: 'Sample Product',
            price: '29.99',
            quantity: 1
          },
          {
            id: '2',
            title: 'Another Product',
            price: '19.99',
            quantity: 2
          }
        ];
        
        const cartTotal = calculateCartTotal(cartItems);
        
        await sessionManager.updateSession(from, {
          cartItems,
          cartTotal
        });
        
        // Send cart confirmation
        await whatsappSender.sendTextMessage(from, 
          `📦 *Cart Summary*
          
${formatCartItems(cartItems)}

*Total: $${cartTotal}*

Please confirm if this is correct by replying with 'yes' or 'no'.`);
        return;
    }
    
    // Update session with next field
    await sessionManager.updateSession(from, {
      customerInfo,
      currentField: nextField,
      state: CONVERSATION_STATES.COLLECTING_CUSTOMER_INFO
    });
    
    // Ask for next field
    await whatsappSender.sendTextMessage(from, nextFieldPrompt);
  } catch (error) {
    console.error('Error collecting customer info:', error);
  }
}

// Handle confirming cart state
async function handleConfirmingCart(from, text, session, sessionManager, whatsappSender, shopifyClient) {
  try {
    const lowerText = text.toLowerCase();
    
    if (lowerText === 'yes' || lowerText === 'y') {
      // Customer confirmed cart, ask for payment method
      await sessionManager.updateSession(from, {
        state: CONVERSATION_STATES.ASKING_PAYMENT_METHOD
      });
      
      await whatsappSender.sendTextMessage(from, 
        `💳 *Payment Method*
        
How would you like to pay?

1. Pay Online (Stripe/Razorpay)
2. Cash on Delivery

Please reply with '1' for online payment or '2' for cash on delivery.`);
    } else if (lowerText === 'no' || lowerText === 'n') {
      // Customer wants to modify cart
      await whatsappSender.sendTextMessage(from, 
        `I apologize for the confusion. Please visit our website to modify your cart, then come back and say 'checkout' when you're ready.`);
      
      // Reset to idle state
      await sessionManager.setSessionState(from, CONVERSATION_STATES.IDLE);
    } else {
      // Invalid response
      await whatsappSender.sendTextMessage(from, 
        `Please confirm if the cart is correct by replying with 'yes' or 'no'.`);
    }
  } catch (error) {
    console.error('Error confirming cart:', error);
  }
}

// Handle asking payment method state
async function handleAskingPaymentMethod(from, text, session, sessionManager, whatsappSender, shopifyClient, paymentGateway, integrations) {
  try {
    if (text === '1') {
      // Online payment
      await processOnlinePayment(from, session, sessionManager, whatsappSender, shopifyClient, paymentGateway, integrations);
    } else if (text === '2') {
      // Cash on delivery
      await processCashOnDelivery(from, session, sessionManager, whatsappSender, shopifyClient);
    } else {
      // Invalid response
      await whatsappSender.sendTextMessage(from, 
        `Please select a payment method:
        
1. Pay Online (Stripe/Razorpay)
2. Cash on Delivery

Reply with '1' or '2'.`);
    }
  } catch (error) {
    console.error('Error asking payment method:', error);
  }
}

// Process online payment
async function processOnlinePayment(from, session, sessionManager, whatsappSender, shopifyClient, paymentGateway, integrations) {
  try {
    // Update session state
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.PROCESSING_PAYMENT,
      paymentMethod: 'online'
    });
    
    // Create draft order in Shopify
    const draftOrderData = {
      line_items: session.cartItems.map(item => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        grams: item.grams || 0
      })),
      customer: {
        first_name: session.customerInfo.name.split(' ')[0] || '',
        last_name: session.customerInfo.name.split(' ').slice(1).join(' ') || '',
        email: session.customerInfo.email || '',
        phone: from
      },
      shipping_address: {
        first_name: session.customerInfo.name.split(' ')[0] || '',
        last_name: session.customerInfo.name.split(' ').slice(1).join(' ') || '',
        address1: session.customerInfo.addressLine1 || '',
        address2: session.customerInfo.addressLine2 || '',
        city: session.customerInfo.city || '',
        province: session.customerInfo.state || '',
        country: 'US', // You might want to make this dynamic
        zip: session.customerInfo.pincode || ''
      },
      note: `WhatsApp checkout initiated by ${from}`,
      tags: 'whatsapp-checkout,online-payment'
    };
    
    console.log('Creating Shopify draft order with data:', JSON.stringify(draftOrderData, null, 2));
    
    const draftOrder = await shopifyClient.createDraftOrder(draftOrderData);
    
    // Create payment link
    const paymentLink = await paymentGateway.createShopifyCheckoutUrl(shopifyClient, draftOrder.id);
    
    // Send payment link to customer
    await whatsappSender.sendTextMessage(from, 
      `💳 *Online Payment*
      
Please complete your payment by clicking the link below:
${paymentLink.url}
      
Once you've completed the payment, please let me know by replying with 'paid'.`);
  } catch (error) {
    console.error('Error processing online payment:', error);
    
    // Reset to payment method selection
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.ASKING_PAYMENT_METHOD
    });
    
    await whatsappSender.sendTextMessage(from, 
      `Sorry, I encountered an error while setting up your payment. Let's try again:
      
💳 *Payment Method*
      
How would you like to pay?

1. Pay Online (Stripe/Razorpay)
2. Cash on Delivery

Please reply with '1' for online payment or '2' for cash on delivery.`);
  }
}

// Process cash on delivery
async function processCashOnDelivery(from, session, sessionManager, whatsappSender, shopifyClient) {
  try {
    // Update session state
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.PROCESSING_PAYMENT,
      paymentMethod: 'cod'
    });
    
    // Create order in Shopify
    const orderData = {
      line_items: session.cartItems.map(item => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        grams: item.grams || 0
      })),
      customer: {
        first_name: session.customerInfo.name.split(' ')[0] || '',
        last_name: session.customerInfo.name.split(' ').slice(1).join(' ') || '',
        email: session.customerInfo.email || '',
        phone: from
      },
      shipping_address: {
        first_name: session.customerInfo.name.split(' ')[0] || '',
        last_name: session.customerInfo.name.split(' ').slice(1).join(' ') || '',
        address1: session.customerInfo.addressLine1 || '',
        address2: session.customerInfo.addressLine2 || '',
        city: session.customerInfo.city || '',
        province: session.customerInfo.state || '',
        country: 'US', // You might want to make this dynamic
        zip: session.customerInfo.pincode || ''
      },
      note: `WhatsApp checkout initiated by ${from}`,
      tags: 'whatsapp-checkout,cod',
      financial_status: 'pending'
    };
    
    console.log('Creating Shopify order with data:', JSON.stringify(orderData, null, 2));
    
    const order = await shopifyClient.createOrder(orderData);
    
    // Send order confirmation
    await sendOrderConfirmation(from, order, session, whatsappSender);
    
    // Update session state
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.ORDER_CONFIRMED,
      orderId: order.id
    });
  } catch (error) {
    console.error('Error processing cash on delivery:', error);
    
    // Reset to payment method selection
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.ASKING_PAYMENT_METHOD
    });
    
    await whatsappSender.sendTextMessage(from, 
      `Sorry, I encountered an error while processing your order. Let's try again:
      
💳 *Payment Method*
      
How would you like to pay?

1. Pay Online (Stripe/Razorpay)
2. Cash on Delivery

Please reply with '1' for online payment or '2' for cash on delivery.`);
  }
}

// Send order confirmation
async function sendOrderConfirmation(from, order, session, whatsappSender) {
  try {
    const orderTotal = order.total || session.cartTotal || '0.00';
    
    await whatsappSender.sendTextMessage(from, 
      `✅ *Order Confirmed!*
      
Thank you for your order! Here are the details:

Order Number: #${order.orderNumber || 'N/A'}
Total: $${orderTotal}

Your order will be delivered to:
${session.customerInfo.addressLine1 || ''}
${session.customerInfo.addressLine2 ? session.customerInfo.addressLine2 + '\n' : ''}
${session.customerInfo.city || ''}, ${session.customerInfo.state || ''} ${session.customerInfo.pincode || ''}

We'll notify you when your order is shipped. Thank you for shopping with us! 🛍️`);
  } catch (error) {
    console.error('Error sending order confirmation:', error);
  }
}

// Handle order confirmed state
async function handleOrderConfirmed(from, text, session, sessionManager, whatsappSender) {
  try {
    // Thank the customer and reset session
    await whatsappSender.sendTextMessage(from, 
      `Thank you for your order! If you have any questions, feel free to ask. Have a great day! 😊`);
    
    // Reset session to idle
    await sessionManager.setSessionState(from, CONVERSATION_STATES.IDLE);
  } catch (error) {
    console.error('Error handling order confirmed:', error);
  }
}

// Add new function to handle the WhatsApp checkout flow
async function handleCheckoutFlow(
  from, 
  text, 
  session, 
  sessionManager, 
  whatsappSender, 
  shopifyClient, 
  paymentGateway,
  integrations,
  db
) {
  try {
    switch (session.state) {
      case CONVERSATION_STATES.CHECKOUT_COLLECTING_NAME:
        await handleCheckoutCollectingName(from, text, session, sessionManager, whatsappSender, db);
        break;
        
      case CONVERSATION_STATES.CHECKOUT_COLLECTING_ADDRESS:
        await handleCheckoutCollectingAddress(from, text, session, sessionManager, whatsappSender, db);
        break;
        
      case CONVERSATION_STATES.CHECKOUT_COLLECTING_PINCODE:
        await handleCheckoutCollectingPincode(from, text, session, sessionManager, whatsappSender, db);
        break;
        
      case CONVERSATION_STATES.CHECKOUT_COLLECTING_EMAIL:
        await handleCheckoutCollectingEmail(from, text, session, sessionManager, whatsappSender, db);
        break;
        
      case CONVERSATION_STATES.CHECKOUT_CONFIRMING_ORDER:
        await handleCheckoutConfirmingOrder(from, text, session, sessionManager, whatsappSender, db);
        break;
        
      case CONVERSATION_STATES.CHECKOUT_PROCESSING_ORDER:
        // This state is handled by payment processing
        break;
        
      default:
        // Start the checkout flow
        await startCheckoutFlow(from, session, sessionManager, whatsappSender, db);
        break;
    }
  } catch (error) {
    console.error('Error handling checkout flow:', error);
    await whatsappSender.sendTextMessage(from, 
      "Sorry, I encountered an error while processing your checkout. Please try again later or contact support.");
  }
}

// Start the checkout flow by collecting customer name
async function startCheckoutFlow(from, session, sessionManager, whatsappSender, db) {
  try {
    // Check if we have pending checkout data for this customer
    const pendingCheckout = await db.collection('pending_whatsapp_checkouts').findOne({ 
      customerPhone: from,
      status: 'pending_whatsapp_confirmation'
    });
    
    if (!pendingCheckout) {
      await whatsappSender.sendTextMessage(from, 
        "I couldn't find your checkout information. Please initiate checkout from the website again.");
      await sessionManager.setSessionState(from, CONVERSATION_STATES.IDLE);
      return;
    }
    
    // Update session with checkout data
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.CHECKOUT_COLLECTING_NAME,
      checkoutData: {
        cartItems: pendingCheckout.cartItems,
        customerInfo: pendingCheckout.customerInfo || {}
      }
    });
    
    await whatsappSender.sendTextMessage(from, 
      "To process your order, I'll need to collect some information.\n\nPlease reply with your full name:");
  } catch (error) {
    console.error('Error starting checkout flow:', error);
  }
}

// Handle collecting customer name
async function handleCheckoutCollectingName(from, text, session, sessionManager, whatsappSender, db) {
  try {
    const customerName = text.trim();
    
    // Update session with customer name
    const updatedCheckoutData = {
      ...session.checkoutData,
      customerInfo: {
        ...session.checkoutData.customerInfo,
        name: customerName
      }
    };
    
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.CHECKOUT_COLLECTING_ADDRESS,
      checkoutData: updatedCheckoutData
    });
    
    await whatsappSender.sendTextMessage(from, 
      `Thank you, ${customerName}! 👋\n\nPlease provide your complete delivery address (including house/flat number, street, and area):`);
  } catch (error) {
    console.error('Error collecting customer name:', error);
  }
}

// Handle collecting customer address
async function handleCheckoutCollectingAddress(from, text, session, sessionManager, whatsappSender, db) {
  try {
    const address = text.trim();
    
    // Update session with customer address
    const updatedCheckoutData = {
      ...session.checkoutData,
      customerInfo: {
        ...session.checkoutData.customerInfo,
        address: address
      }
    };
    
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.CHECKOUT_COLLECTING_PINCODE,
      checkoutData: updatedCheckoutData
    });
    
    await whatsappSender.sendTextMessage(from, 
      "Please provide your pincode:");
  } catch (error) {
    console.error('Error collecting customer address:', error);
  }
}

// Handle collecting customer pincode
async function handleCheckoutCollectingPincode(from, text, session, sessionManager, whatsappSender, db) {
  try {
    const pincode = text.trim();
    
    // Validate pincode (should be numeric)
    if (!/^\d{6}$/.test(pincode)) {
      await whatsappSender.sendTextMessage(from, 
        "Please provide a valid 6-digit pincode:");
      return;
    }
    
    // Update session with customer pincode
    const updatedCheckoutData = {
      ...session.checkoutData,
      customerInfo: {
        ...session.checkoutData.customerInfo,
        pincode: pincode
      }
    };
    
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.CHECKOUT_COLLECTING_EMAIL,
      checkoutData: updatedCheckoutData
    });
    
    await whatsappSender.sendTextMessage(from, 
      "Please provide your email address:");
  } catch (error) {
    console.error('Error collecting customer pincode:', error);
  }
}

// Handle collecting customer email
async function handleCheckoutCollectingEmail(from, text, session, sessionManager, whatsappSender, db) {
  try {
    const email = text.trim();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await whatsappSender.sendTextMessage(from, 
        "Please provide a valid email address:");
      return;
    }
    
    // Update session with customer email
    const updatedCheckoutData = {
      ...session.checkoutData,
      customerInfo: {
        ...session.checkoutData.customerInfo,
        email: email
      }
    };
    
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.CHECKOUT_CONFIRMING_ORDER,
      checkoutData: updatedCheckoutData
    });
    
    // Format cart items for display
    const cartItems = session.checkoutData.cartItems;
    const cartSummary = cartItems.map(item => 
      `• ${item.title} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');
    
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
    
    await whatsappSender.sendTextMessage(from, 
      `📦 *Order Summary*
      
${cartSummary}

*Total: $${cartTotal}*

Please confirm if this is correct by replying with 'yes' to proceed with the order, or 'no' to cancel:`);
  } catch (error) {
    console.error('Error collecting customer email:', error);
  }
}

// Handle confirming order
async function handleCheckoutConfirmingOrder(from, text, session, sessionManager, whatsappSender, db) {
  try {
    const lowerText = text.toLowerCase();
    
    if (lowerText === 'yes' || lowerText === 'y') {
      // Customer confirmed, process the order
      await processCheckoutOrder(from, session, sessionManager, whatsappSender, db);
    } else if (lowerText === 'no' || lowerText === 'n') {
      // Customer cancelled
      await whatsappSender.sendTextMessage(from, 
        "Your order has been cancelled. If you'd like to place an order in the future, just let me know!");
      
      // Reset session to idle
      await sessionManager.setSessionState(from, CONVERSATION_STATES.IDLE);
      
      // Update pending checkout status
      await db.collection('pending_whatsapp_checkouts').updateOne(
        { customerPhone: from, status: 'pending_whatsapp_confirmation' },
        { $set: { status: 'cancelled', cancelledAt: new Date() } }
      );
    } else {
      // Invalid response
      await whatsappSender.sendTextMessage(from, 
        "Please confirm if the order is correct by replying with 'yes' to proceed, or 'no' to cancel:");
    }
  } catch (error) {
    console.error('Error confirming order:', error);
  }
}

// Process the checkout order
async function processCheckoutOrder(from, session, sessionManager, whatsappSender, db) {
  try {
    // Update session state
    await sessionManager.updateSession(from, {
      state: CONVERSATION_STATES.CHECKOUT_PROCESSING_ORDER
    });
    
    // Get integration data
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    const { shopify, whatsapp: whatsappConfig } = integrations;
    
    // Check if we have the required Shopify integration data
    if (!shopify || !shopify.shopDomain || !shopify.accessToken) {
      throw new Error('Shopify integration is not properly configured. Please check your Shopify settings in the dashboard.');
    }
    
    // Get checkout data
    const { cartItems, customerInfo } = session.checkoutData;
    
    // Validate we have required data
    if (!cartItems || cartItems.length === 0) {
      throw new Error('No items found in cart. Please try initiating the checkout again from the website.');
    }
    
    if (!customerInfo || !customerInfo.name || !customerInfo.address || !customerInfo.pincode) {
      throw new Error('Customer information is incomplete. Please restart the checkout process.');
    }
    
    // Validate and clean the customer phone number
    if (!from) {
      throw new Error('Customer phone number is missing. Please restart the checkout process.');
    }
    
    // Clean the phone number (remove any non-digit characters)
    const cleanCustomerPhone = from.replace(/\D/g, '');
    
    if (cleanCustomerPhone.length < 10) {
      throw new Error('Invalid customer phone number format. Please restart the checkout process.');
    }
    
    // Calculate cart total
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Validate cart items have required properties
    for (const item of cartItems) {
      if (!item.title || item.price === undefined || item.quantity === undefined) {
        throw new Error(`Invalid cart item data: ${JSON.stringify(item)}. Please try initiating the checkout again.`);
      }
    }
    
    // Create draft order in Shopify
    const firstName = customerInfo.name.split(' ')[0] || customerInfo.name || '';
    const lastName = customerInfo.name.split(' ').slice(1).join(' ') || '';
    
    const draftOrderData = {
      draft_order: {
        line_items: cartItems.map(item => ({
          title: item.title,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          grams: item.grams ? parseInt(item.grams) : 0,
          variant_id: item.variant_id ? parseInt(item.variant_id) : null
        })),
        customer: {
          first_name: firstName,
          last_name: lastName,
          phone: cleanCustomerPhone
        },
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address1: customerInfo.address || '',
          zip: customerInfo.pincode || ''
        },
        note: `WhatsApp checkout initiated by ${cleanCustomerPhone}`,
        tags: 'whatsapp-checkout',
        total_price: parseFloat(cartTotal.toFixed(2))
      }
    };
    
    console.log('Creating Shopify draft order with data:', JSON.stringify(draftOrderData, null, 2));
    
    // Create the draft order
    const response = await fetch(`https://${shopify.shopDomain}/admin/api/2023-10/draft_orders.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopify.accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftOrderData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Shopify draft order creation failed:', data);
      let errorMessage = `Shopify API Error: ${response.status} ${response.statusText}`;
      
      if (data && data.errors) {
        if (typeof data.errors === 'string') {
          errorMessage = `Shopify API Error: ${data.errors}`;
        } else if (typeof data.errors === 'object') {
          // Handle validation errors
          const errorDetails = Object.keys(data.errors).map(key => {
            const value = data.errors[key];
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`;
            }
            return `${key}: ${value}`;
          }).join('; ');
          
          if (errorDetails) {
            errorMessage = `Shopify Validation Error: ${errorDetails}`;
          } else {
            errorMessage = `Shopify API Error: ${JSON.stringify(data.errors)}`;
          }
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const draftOrder = data.draft_order;
    
    // Log draft order creation success
    console.log(`Successfully created Shopify draft order with ID: ${draftOrder.id}`);
    
    // Create payment link by sending invoice
    // Prepare invoice data with both phone and email if available
    const invoicePayload = {
      invoice: {
        subject: 'Your Order Payment',
        custom_message: 'Thank you for your order! Please complete your payment using the link below.'
      }
    };
    
    // Shopify requires either a phone number or email for the invoice
    // We'll use the phone number, and include email if available
    if (cleanCustomerPhone && cleanCustomerPhone.length >= 10) {
      invoicePayload.invoice.to = cleanCustomerPhone;
      console.log(`Using phone number for invoice: ${cleanCustomerPhone}`);
    } else if (customerInfo.email) {
      invoicePayload.invoice.to = customerInfo.email;
      console.log(`Using email for invoice: ${customerInfo.email}`);
    } else {
      const errorMsg = 'Customer must have either a valid phone number or email address to receive the invoice.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('Creating Shopify invoice with payload:', JSON.stringify(invoicePayload, null, 2));
    
    const invoiceResponse = await fetch(`https://${shopify.shopDomain}/admin/api/2023-10/draft_orders/${draftOrder.id}/send_invoice.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopify.accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    });
    
    // Log the raw response for debugging
    console.log(`Shopify invoice API response status: ${invoiceResponse.status}`);
    console.log(`Shopify invoice API response headers: ${JSON.stringify(Object.fromEntries(invoiceResponse.headers.entries()))}`);
    
    const invoiceData = await invoiceResponse.json();
    
    // Log the response data for debugging
    console.log(`Shopify invoice API response data: ${JSON.stringify(invoiceData, null, 2)}`);
    
    if (!invoiceResponse.ok) {
      console.error('Shopify invoice creation failed:', invoiceData);
      let errorMessage = `Shopify Invoice Error: ${invoiceResponse.status} ${invoiceResponse.statusText}`;
      
      if (invoiceData && invoiceData.errors) {
        if (typeof invoiceData.errors === 'string') {
          errorMessage = `Shopify Invoice Error: ${invoiceData.errors}`;
        } else if (typeof invoiceData.errors === 'object') {
          const errorDetails = Object.keys(invoiceData.errors).map(key => {
            const value = invoiceData.errors[key];
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`;
            }
            return `${key}: ${value}`;
          }).join('; ');
          
          if (errorDetails) {
            errorMessage = `Shopify Invoice Validation Error: ${errorDetails}`;
          } else {
            errorMessage = `Shopify Invoice Error: ${JSON.stringify(invoiceData.errors)}`;
          }
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const paymentLink = invoiceData.draft_order.invoice_url;
    
    // Send order confirmation with payment link
    await whatsappSender.sendTextMessage(cleanCustomerPhone, 
      `✅ *Order Confirmation*
      
Thank you for your order! Here's a summary:

Order ID: #${draftOrder.id}
${cartItems.map(item => `• ${item.title} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

*Total: $${cartTotal.toFixed(2)}*

Please complete your payment by clicking the link below:
${paymentLink}

If you have any questions, feel free to ask!`);
    
    // Update pending checkout status
    await db.collection('pending_whatsapp_checkouts').updateOne(
      { customerPhone: cleanCustomerPhone, status: 'pending_whatsapp_confirmation' },
      { $set: { 
          status: 'order_created', 
          shopifyDraftOrderId: draftOrder.id,
          completedAt: new Date() 
        } 
      }
    );
    
    // Convert draft order to real order to trigger proper Shopify workflows
    try {
      // Send the invoice to convert draft order to real order
      const invoiceResponse = await fetch(`https://${shopify.shopDomain}/admin/api/2023-10/draft_orders/${draftOrder.id}/send_invoice.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopify.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice: {
            to: cleanCustomerPhone
          }
        })
      });
      
      if (invoiceResponse.ok) {
        console.log(`Successfully sent invoice for draft order ${draftOrder.id}`);
        
        // Trigger Shopify Order Status Automation
        try {
          await triggerShopifyOrderStatusAutomation(db, integrations, draftOrder.id.toString(), cleanCustomerPhone);
          console.log(`Successfully triggered Shopify Order Status Automation for order ${draftOrder.id}`);
        } catch (automationError) {
          console.error(`Failed to trigger Shopify Order Status Automation for order ${draftOrder.id}:`, automationError);
          // Send error notification to admin using simple text message
          await whatsappSender.sendTextMessage(whatsappConfig.phoneNumberId, 
            `⚠️ *Automation Error*
            
Failed to trigger Shopify Order Status Automation for WhatsApp order #${draftOrder.id}.
Error: ${automationError.message}
            
Please check the system manually.`);
        }
      } else {
        const errorData = await invoiceResponse.json();
        console.error(`Failed to send invoice for draft order ${draftOrder.id}:`, errorData);
        throw new Error(`Failed to send invoice: ${JSON.stringify(errorData)}`);
      }
    } catch (invoiceError) {
      console.error(`Error processing invoice for draft order ${draftOrder.id}:`, invoiceError);
      throw invoiceError;
    }
    
    // Reset session to idle
    await sessionManager.setSessionState(cleanCustomerPhone, CONVERSATION_STATES.IDLE);
    
  } catch (error) {
    console.error('Error processing checkout order:', error);
    
    // Send a more specific error message using simple text
    let errorMessage = "Sorry, I encountered an error while processing your order. ";
    
    // Provide more specific error information
    if (error.message.includes('Shopify')) {
      if (error.message.includes('Validation')) {
        errorMessage += "There was a data validation issue with your order. ";
      } else {
        errorMessage += "There was an issue with the store integration. ";
      }
    } else if (error.message.includes('fetch')) {
      errorMessage += "There was a network connectivity issue. ";
    } else if (error.message.includes('configured')) {
      errorMessage += "The system is not properly configured. ";
    } else {
      errorMessage += "Please try again later or contact support. ";
    }
    
    // Add the actual error for debugging (but limit length)
    const errorDetail = error.message.length < 100 ? error.message : "Order processing error occurred";
    errorMessage += "Error details: " + errorDetail;
    
    // Try to send error message to customer if we have a valid phone number
    try {
      const cleanCustomerPhone = from ? from.replace(/\D/g, '') : null;
      if (cleanCustomerPhone && cleanCustomerPhone.length >= 10) {
        await whatsappSender.sendTextMessage(cleanCustomerPhone, errorMessage);
      }
    } catch (sendError) {
      console.error('Failed to send error message to customer:', sendError);
    }
    
    // Reset session to idle if we have a valid phone number
    try {
      const cleanCustomerPhone = from ? from.replace(/\D/g, '') : null;
      if (cleanCustomerPhone && cleanCustomerPhone.length >= 10) {
        await sessionManager.setSessionState(cleanCustomerPhone, CONVERSATION_STATES.IDLE);
      }
    } catch (sessionError) {
      console.error('Failed to reset session state:', sessionError);
    }
  }
}

// Process message status updates
async function processMessageStatus(status, value, db, integrations) {
  try {
    console.log('Processing WhatsApp message status update:', JSON.stringify(status, null, 2));
    
    // Extract relevant information
    const messageId = status.id;
    const statusType = status.status;
    const recipientId = status.recipient_id;
    const timestamp = status.timestamp;
    
    // Log the status update
    console.log(`Message ${messageId} status updated to ${statusType} for recipient ${recipientId} at ${timestamp}`);
    
    // You could add more specific handling here based on the status type:
    switch (statusType) {
      case 'sent':
        console.log(`Message ${messageId} sent to ${recipientId}`);
        break;
      case 'delivered':
        console.log(`Message ${messageId} delivered to ${recipientId}`);
        break;
      case 'read':
        console.log(`Message ${messageId} read by ${recipientId}`);
        break;
      case 'failed':
        console.log(`Message ${messageId} failed to ${recipientId}`);
        // You might want to log the error or take some action
        if (status.errors) {
          console.error(`Error details:`, status.errors);
        }
        break;
      default:
        console.log(`Unknown status ${statusType} for message ${messageId}`);
    }
    
    // Optionally, update message status in your database
    if (messageId) {
      await db.collection('message_status_log').insertOne({
        messageId: messageId,
        status: statusType,
        recipientId: recipientId,
        timestamp: new Date(timestamp * 1000), // Convert Unix timestamp to JavaScript Date
        rawStatus: status,
        createdAt: new Date()
      });
    }
    
  } catch (error) {
    console.error('Error processing message status:', error);
  }
}

module.exports = {
  handleWhatsAppWebhook,
  processMessageStatus
};
