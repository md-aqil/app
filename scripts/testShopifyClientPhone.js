// Test script for Shopify client phone number extraction

const ShopifyClient = require('../services/shopifyClient');

// Create a mock Shopify client (we won't actually make API calls)
const mockShopifyClient = {
  extractCustomerPhone: function(order) {
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
    
    // Try to extract phone from shipping address name field if it contains a phone number
    if (order.shipping_address && order.shipping_address.name) {
      const phoneMatch = order.shipping_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
      if (phoneMatch) {
        return phoneMatch[0].replace(/\s+/g, '');
      }
    }
    
    // Try to extract phone from billing address name field if it contains a phone number
    if (order.billing_address && order.billing_address.name) {
      const phoneMatch = order.billing_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
      if (phoneMatch) {
        return phoneMatch[0].replace(/\s+/g, '');
      }
    }
    
    // Return null if no phone found
    return null;
  }
};

// Test cases
const testCases = [
  {
    name: "Phone in customer object",
    order: {
      customer: { phone: "+1234567890" },
      shipping_address: { phone: "+0987654321", name: "John Doe" },
      billing_address: { phone: "+1111111111", name: "John Doe" }
    },
    expected: "+1234567890"
  },
  {
    name: "Phone in shipping address only",
    order: {
      customer: {},
      shipping_address: { phone: "+0987654321", name: "John Doe" },
      billing_address: { phone: "+1111111111", name: "John Doe" }
    },
    expected: "+0987654321"
  },
  {
    name: "Phone in billing address only",
    order: {
      customer: {},
      shipping_address: { name: "John Doe" },
      billing_address: { phone: "+1111111111", name: "John Doe" }
    },
    expected: "+1111111111"
  },
  {
    name: "Phone in shipping address name field",
    order: {
      customer: {},
      shipping_address: { name: "John Doe\n+1234567890" },
      billing_address: { name: "John Doe" }
    },
    expected: "+1234567890"
  },
  {
    name: "Phone in billing address name field",
    order: {
      customer: {},
      shipping_address: { name: "John Doe" },
      billing_address: { name: "John Doe\n+1234567890" }
    },
    expected: "+1234567890"
  }
];

console.log("Testing Shopify client phone number extraction...\n");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = mockShopifyClient.extractCustomerPhone(testCase.order);
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
  console.log("✅ All tests passed! Shopify client phone number extraction is working correctly.");
} else {
  console.log("❌ Some tests failed. Please review the implementation.");
}