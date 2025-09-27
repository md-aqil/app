// Test script for Shopify webhook integration with Next.js API routes

const { MongoClient } = require('mongodb');
const config = require('../config');

// Mock request and response objects that simulate the Next.js API route environment
const createMockRequest = (topic, webhookId, payload) => ({
  headers: {
    'x-shopify-topic': topic,
    'x-shopify-webhook-id': webhookId,
    'x-shopify-hmac-sha256': 'test-hmac-signature',
    'content-length': JSON.stringify(payload).length.toString()
  },
  body: payload,
  method: 'POST'
});

// Mock response collector
let responseCollector = null;

const createMockResponse = () => {
  return {
    status: (code) => {
      return {
        json: (data) => {
          // Store the response data for later inspection
          responseCollector = {
            status: code,
            data: data
          };
          return responseCollector;
        }
      };
    }
  };
};

// Mock database
const createMockDb = () => ({
  collection: (name) => ({
    updateOne: async () => ({ result: 'ok' }),
    findOne: async () => null
  })
});

// Mock integrations
const mockIntegrations = {
  shopify: {
    shopDomain: 'test.myshopify.com',
    accessToken: 'test-access-token'
  },
  whatsapp: {
    phoneNumberId: 'test-phone-id',
    accessToken: 'test-whatsapp-token'
  }
};

// Import the webhook handler
const handleShopifyWebhook = require('../routes/webhook/shopify');

async function testDuplicateWebhookHandling() {
  console.log('Testing duplicate webhook handling in Next.js environment...\n');
  
  try {
    // Test 1: Process first webhook
    console.log('Test 1: Processing first webhook...');
    const req1 = createMockRequest('orders/create', 'test-webhook-id-123', { id: 12345 });
    const res1 = createMockResponse();
    responseCollector = null; // Reset collector
    
    const result1 = await handleShopifyWebhook(req1, res1, createMockDb(), mockIntegrations);
    
    console.log(`Result:`, result1);
    console.log(`Response collector:`, responseCollector);
    
    // Test 2: Process duplicate webhook
    console.log('\nTest 2: Processing duplicate webhook...');
    const req2 = createMockRequest('orders/create', 'test-webhook-id-123', { id: 12345 }); // Same ID
    const res2 = createMockResponse();
    responseCollector = null; // Reset collector
    
    const result2 = await handleShopifyWebhook(req2, res2, createMockDb(), mockIntegrations);
    
    console.log(`Result:`, result2);
    console.log(`Response collector:`, responseCollector);
    
    // Verify results
    if (responseCollector && responseCollector.status === 200 && responseCollector.data.message === 'Duplicate webhook ignored') {
      console.log('\n✅ Duplicate webhook correctly identified and handled');
    } else {
      console.log('\n❌ Duplicate webhook handling failed');
      console.log(`Expected status 200 with "Duplicate webhook ignored" message`);
      console.log(`Got:`, responseCollector);
    }
  } catch (error) {
    console.error('❌ Error testing webhook handler:', error);
  }
}

async function testMissingWebhookId() {
  console.log('\n\nTesting webhook with missing ID...\n');
  
  try {
    const req = createMockRequest('orders/create', null, { id: 12345 }); // No webhook ID
    const res = createMockResponse();
    responseCollector = null; // Reset collector
    
    const result = await handleShopifyWebhook(req, res, createMockDb(), mockIntegrations);
    
    console.log(`Result:`, result);
    console.log(`Response collector:`, responseCollector);
    
    if (responseCollector && responseCollector.status === 200) {
      console.log('\n✅ Webhook with missing ID processed successfully');
    } else {
      console.log('\n❌ Webhook with missing ID processing failed');
    }
  } catch (error) {
    console.error('❌ Error testing webhook handler:', error);
  }
}

// Run tests
async function runTests() {
  await testDuplicateWebhookHandling();
  await testMissingWebhookId();
}

runTests();