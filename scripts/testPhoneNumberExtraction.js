// Script to test the robustness of phone number extraction from Shopify orders
// Usage: node scripts/testPhoneNumberExtraction.js

const { MongoClient } = require('mongodb');
const ShopifyClient = require('../services/shopifyClient');

// Test the getCustomerPhone function logic
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
  
  // Return null if no phone found
  return null;
}

// Test cases
const testCases = [
  {
    name: "Phone in customer object",
    order: {
      customer: { phone: "+1234567890" },
      shipping_address: { phone: "+0987654321" },
      billing_address: { phone: "+1111111111" }
    },
    expected: "+1234567890"
  },
  {
    name: "Phone in shipping address only",
    order: {
      customer: {},
      shipping_address: { phone: "+0987654321" },
      billing_address: { phone: "+1111111111" }
    },
    expected: "+0987654321"
  },
  {
    name: "Phone in billing address only",
    order: {
      customer: {},
      shipping_address: {},
      billing_address: { phone: "+1111111111" }
    },
    expected: "+1111111111"
  },
  {
    name: "No phone numbers",
    order: {
      customer: {},
      shipping_address: {},
      billing_address: {}
    },
    expected: null
  },
  {
    name: "Phone in all locations (should use customer)",
    order: {
      customer: { phone: "+1234567890" },
      shipping_address: { phone: "+0987654321" },
      billing_address: { phone: "+1111111111" }
    },
    expected: "+1234567890"
  }
];

console.log("Testing phone number extraction logic...\n");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = getCustomerPhone(testCase.order);
  const passed = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Expected: ${testCase.expected}`);
  console.log(`Got: ${result}`);
  console.log(`Status: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log("");
  
  if (passed) passedTests++;
});

console.log(`Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log("✅ Phone number extraction logic is working correctly!");
} else {
  console.log("❌ Phone number extraction logic has issues!");
}

// Now test with actual Shopify orders
async function testWithRealOrders() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'WhatsApp_api';
    
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    
    // Get integrations
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    
    if (!integrations) {
      console.log("No integrations found in database");
      await client.close();
      return;
    }
    
    // Initialize Shopify client
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    // Get recent orders from database
    const orders = await db.collection('orders').find({ source: 'shopify' })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log("\nTesting with real Shopify orders from database:");
    
    for (const dbOrder of orders) {
      console.log(`\nOrder ID: ${dbOrder.shopifyOrderId}`);
      
      try {
        // Fetch complete order data from Shopify
        const shopifyOrder = await shopifyClient.getOrder(dbOrder.shopifyOrderId);
        
        // Extract phone using our logic
        const extractedPhone = getCustomerPhone({
          customer: { phone: shopifyOrder.customerPhone },
          shipping_address: shopifyOrder.shippingAddress,
          billing_address: shopifyOrder.billingAddress
        });
        
        console.log(`  Database phone: ${dbOrder.customerPhone || "null"}`);
        console.log(`  Extracted phone: ${extractedPhone || "null"}`);
        console.log(`  Match: ${extractedPhone === dbOrder.customerPhone ? "✅" : "⚠️"}`);
        
        // Show where the phone number was found
        if (extractedPhone) {
          let source = "unknown";
          if (shopifyOrder.customerPhone === extractedPhone) {
            source = "customer object";
          } else if (shopifyOrder.shippingAddress?.phone === extractedPhone) {
            source = "shipping address";
          } else if (shopifyOrder.billingAddress?.phone === extractedPhone) {
            source = "billing address";
          }
          console.log(`  Phone source: ${source}`);
        }
      } catch (error) {
        console.log(`  Error fetching order: ${error.message}`);
      }
    }
    
    await client.close();
  } catch (error) {
    console.error("Error testing with real orders:", error.message);
  }
}

// Run the real order test
testWithRealOrders();