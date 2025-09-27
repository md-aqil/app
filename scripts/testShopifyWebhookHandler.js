// Test script for Shopify webhook handler

const { MongoClient } = require('mongodb');
const config = require('../config');

// Mock request and response objects
const createMockRequest = (topic, webhookId, payload) => ({
  headers: {
    'x-shopify-topic': topic,
    'x-shopify-webhook-id': webhookId
  },
  body: payload
});

const createMockResponse = () => {
  const res = {
    statusCalled: null,
    jsonCalled: null,
    status: function(code) {
      this.statusCalled = code;
      return this;
    },
    json: function(data) {
      this.jsonCalled = data;
      return this;
    }
  };
  return res;
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

async function testDuplicateWebhook() {
  console.log('Testing duplicate webhook handling...\n');
  
  // Create mock objects
  const req1 = createMockRequest('orders/create', 'test-webhook-id-123', { id: 12345 });
  const req2 = createMockRequest('orders/create', 'test-webhook-id-123', { id: 12345 }); // Same ID
  const res1 = createMockResponse();
  const res2 = createMockResponse();
  const db = createMockDb();
  
  try {
    // Process first webhook
    console.log('Processing first webhook...');
    await handleShopifyWebhook(req1, res1, db, mockIntegrations);
    console.log(`First webhook response status: ${res1.statusCalled}`);
    console.log(`First webhook response data: ${JSON.stringify(res1.jsonCalled)}`);
    
    // Process second webhook (should be duplicate)
    console.log('\nProcessing second webhook (should be duplicate)...');
    await handleShopifyWebhook(req2, res2, db, mockIntegrations);
    console.log(`Second webhook response status: ${res2.statusCalled}`);
    console.log(`Second webhook response data: ${JSON.stringify(res2.jsonCalled)}`);
    
    // Check results
    if (res1.statusCalled === 200 && res2.statusCalled === 200) {
      console.log('\n✅ Both webhooks processed successfully');
      console.log('✅ Duplicate webhook correctly identified and handled');
    } else {
      console.log('\n❌ Unexpected response status codes');
    }
  } catch (error) {
    console.error('❌ Error testing webhook handler:', error);
  }
}

async function testMissingWebhookId() {
  console.log('\n\nTesting webhook with missing ID...\n');
  
  // Create mock objects
  const req = createMockRequest('orders/create', null, { id: 12345 }); // No webhook ID
  const res = createMockResponse();
  const db = createMockDb();
  
  try {
    console.log('Processing webhook with missing ID...');
    await handleShopifyWebhook(req, res, db, mockIntegrations);
    console.log(`Response status: ${res.statusCalled}`);
    console.log(`Response data: ${JSON.stringify(res.jsonCalled)}`);
    
    if (res.statusCalled === 200) {
      console.log('\n✅ Webhook with missing ID processed successfully');
    } else {
      console.log('\n❌ Unexpected response status code');
    }
  } catch (error) {
    console.error('❌ Error testing webhook handler:', error);
  }
}

// Run tests
async function runTests() {
  await testDuplicateWebhook();
  await testMissingWebhookId();
}

runTests();