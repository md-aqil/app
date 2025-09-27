// Test script for WhatsApp status webhook handling

const { MongoClient } = require('mongodb');
const { processMessageStatus } = require('../routes/webhook/whatsapp');

// Sample status update payload (similar to what you received)
const sampleStatusUpdate = {
  "id": "wamid.HBgMOTE3MjEwNTYyMDE0FQIAERgSOTdDMTUxMUE0ODAxOEJEMUJBAA==",
  "status": "read",
  "timestamp": "1758998521",
  "recipient_id": "917210562014",
  "conversation": {
    "id": "51bf60176e31a6a710179c395094ffef",
    "origin": {
      "type": "service"
    }
  },
  "pricing": {
    "billable": false,
    "pricing_model": "PMP",
    "category": "service",
    "type": "free_customer_service"
  }
};

// Mock value object
const mockValue = {
  "messaging_product": "whatsapp",
  "metadata": {
    "display_phone_number": "15551823471",
    "phone_number_id": "818391834688215"
  }
};

// Mock database
const mockDb = {
  collection: (name) => {
    return {
      insertOne: async (doc) => {
        console.log(`Would insert into ${name} collection:`, JSON.stringify(doc, null, 2));
        return { insertedId: 'mock-id' };
      }
    };
  }
};

// Mock integrations
const mockIntegrations = {
  whatsapp: {
    phoneNumberId: '818391834688215',
    accessToken: 'mock-access-token'
  }
};

async function testStatusProcessing() {
  console.log('Testing WhatsApp status update processing...\n');
  
  try {
    await processMessageStatus(sampleStatusUpdate, mockValue, mockDb, mockIntegrations);
    console.log('\n✅ Status processing completed successfully');
  } catch (error) {
    console.error('❌ Error processing status update:', error);
  }
}

// Run the test
testStatusProcessing();