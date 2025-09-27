# Shopify Webhook Next.js Integration Fix

## Problem Description

The Shopify webhook handler was returning 500 errors when processing duplicate webhooks in the Next.js API route environment. While the system was correctly identifying and ignoring duplicate webhooks, there were issues with how the response was being handled in the Next.js API route context.

## Root Cause

The main issues identified were:

1. **Response Handling Mismatch**: The Shopify webhook handler was designed for Express-style response handling (`res.status().json()`), but the Next.js API route environment required direct return of NextResponse objects.
2. **Async Control Flow**: The asyncHandler middleware wasn't properly handling the response flow from the Shopify webhook handler.
3. **Error Propagation**: Unhandled exceptions in the response sending process were causing 500 errors.

## Solution Implemented

### 1. Enhanced Response Handling in API Route

Updated the Next.js API route to properly handle responses from the Shopify webhook handler:

```javascript
// Shopify Webhook endpoint
if (route === '/webhook/shopify' && method === 'POST') {
  // ... validation code ...
  
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
```

### 2. Improved Error Handling in Webhook Handler

Enhanced the Shopify webhook handler to properly handle errors and responses:

```javascript
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
          return;
        }
      }
    } else {
      console.warn('Webhook ID is missing - cannot deduplicate this webhook');
    }
    
    // ... rest of the handler ...
    
    // Return success response
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    // Return error response
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}
```

### 3. Enhanced Duplicate Webhook Detection

Improved the duplicate webhook detection function with better error handling:

```javascript
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
```

## Testing

Created a comprehensive test script `testShopifyWebhookIntegration.js` to verify the fix works correctly in the Next.js environment:

1. **Duplicate Webhook Test**: Confirms that duplicate webhooks are correctly identified and handled with proper responses
2. **Missing Webhook ID Test**: Verifies that webhooks with missing IDs are processed without errors
3. **Response Handling Test**: Ensures all response types are handled correctly in the Next.js context

The tests confirm that:
- ✅ Duplicate webhooks are correctly identified and return a 200 status with appropriate message
- ✅ Webhooks with missing IDs are processed without errors
- ✅ All response types are handled correctly in the Next.js API route context
- ✅ Error handling prevents unhandled exceptions

## Impact

With these fixes:
1. Shopify webhook duplicate processing works correctly in the Next.js environment
2. Error handling prevents 500 errors from response sending issues
3. Better logging makes debugging easier
4. Edge cases with missing webhook IDs are handled gracefully
5. The system is more resilient to transient network issues

## Future Considerations

1. Consider using a persistent store (like Redis) instead of in-memory storage for webhook deduplication in production
2. Add more sophisticated logging and monitoring
3. Implement proper webhook signature verification
4. Add metrics tracking for webhook processing performance
5. Consider implementing a more robust error handling strategy for the Shopify API calls