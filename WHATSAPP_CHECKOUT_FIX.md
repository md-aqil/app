# WhatsApp Checkout Flow Fix

## Issue Description

When customers placed orders through Shopify (not WhatsApp), and then sent a message to the WhatsApp bot, they were receiving checkout-related messages like "Please provide your pincode:" instead of order confirmation or status messages.

## Root Cause

The WhatsApp webhook handler was automatically starting the checkout flow for any customer with a pending WhatsApp checkout, regardless of whether:
1. The customer was actually trying to checkout via WhatsApp
2. The customer was asking about an existing Shopify order
3. The pending checkout was created recently or long ago

## Solution

Modified the WhatsApp webhook handler logic in `routes/webhook/whatsapp.js` to be more selective about when to automatically start the checkout flow:

### Changes Made

1. **Added time-based filtering**: Only automatically start checkout flow for pending checkouts created within the last 5 minutes

2. **Added content-based filtering**: Don't automatically start checkout flow if the customer's message appears to be about existing orders (contains words like "order", "status", "shipment", "delivery", "tracking")

3. **Added safety check in checkout flow**: If a customer in the checkout flow sends an order-related message, exit the checkout flow and reset to idle state

### Code Changes

#### In `processIncomingMessage` function:
```javascript
// Before: Always start checkout flow for pending checkouts
if (pendingCheckout) {
  // Start checkout flow immediately
  await startCheckoutFlow(from, session, sessionManager, whatsappSender, db);
  // ...
}

// After: Only start checkout flow for recent, non-order-related messages
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
    // ...
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
}
```

#### In checkout flow handling:
```javascript
// Before: Always continue checkout flow
if (session.state && session.state.startsWith('checkout_')) {
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

// After: Exit checkout flow for order-related messages
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
```

## Result

Customers who place orders through Shopify and then message the WhatsApp bot will now:
1. Receive appropriate order confirmation/status messages
2. Not be forced into the WhatsApp checkout flow
3. Only enter the checkout flow if they explicitly indicate they want to checkout or if they have a very recent pending checkout and send a non-order-related message

This fix ensures that the WhatsApp automation works correctly for both Shopify order notifications and WhatsApp-initiated checkouts.