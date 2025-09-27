# WhatsApp Webhook Status Update Fix

## Problem Description

The WhatsApp webhook was returning a 500 error when receiving status updates (like message read notifications) because the webhook handler was only processing incoming messages but not handling status updates.

## Root Cause

The WhatsApp webhook handler in `routes/webhook/whatsapp.js` was only checking for `messages` field in the webhook payload but not handling `statuses` updates. The payload you received contained status information but no message content, causing the handler to skip processing and potentially throw an error.

## Solution Implemented

### 1. Enhanced WhatsApp Webhook Handler

Updated the main webhook handler to process both incoming messages and status updates:

```javascript
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
```

### 2. Added Status Processing Function

Created a new function `processMessageStatus` to handle status updates:

```javascript
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
    
    // Handle different status types
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
        // Log error details if available
        if (status.errors) {
          console.error(`Error details:`, status.errors);
        }
        break;
      default:
        console.log(`Unknown status ${statusType} for message ${messageId}`);
    }
    
    // Store status update in database
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
```

### 3. Database Schema Updates

Updated the database initialization script to include a new collection for tracking message statuses:

```javascript
const requiredCollections = [
  // ... existing collections
  'message_status_log'  // New collection for WhatsApp message status tracking
]

// Create indexes
await db.collection('message_status_log').createIndex({ messageId: 1, timestamp: -1 });
```

### 4. Module Exports

Updated the module exports to include the new status processing function:

```javascript
module.exports = {
  handleWhatsAppWebhook,
  processMessageStatus
};
```

## Testing

Created a test script `testWhatsAppStatusWebhook.js` to verify the fix works correctly with sample status update payloads. The test confirms that:

1. Status updates are properly processed without errors
2. Different status types (sent, delivered, read, failed) are handled correctly
3. Status information is logged appropriately
4. Database insertion works as expected

## Impact

With this fix:
1. WhatsApp webhook status updates no longer cause 500 errors
2. Message status information is properly tracked and logged
3. The system can monitor message delivery and read status
4. Failed message notifications can be detected and handled

## Future Considerations

1. Add more sophisticated error handling for failed messages
2. Implement notifications for admin when messages fail
3. Add metrics tracking for message delivery rates
4. Consider adding retry logic for failed status processing