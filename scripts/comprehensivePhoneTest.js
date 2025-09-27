// Comprehensive test for phone number extraction logic
// Tests all possible scenarios for phone number extraction

// Enhanced phone number extraction function
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
  
  // Try to extract phone from shipping address name field if it contains a phone number
  // This handles cases where phone numbers are stored in the name field
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
    name: "No phone numbers anywhere",
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
  },
  {
    name: "Phone in shipping address name field",
    order: {
      customer: {},
      shipping_address: { name: "John Doe\n+1234567890" },
      billing_address: {}
    },
    expected: "+1234567890"
  },
  {
    name: "Phone in billing address name field",
    order: {
      customer: {},
      shipping_address: {},
      billing_address: { name: "John Doe\n+1234567890" }
    },
    expected: "+1234567890"
  },
  {
    name: "Phone with spaces and dashes in name field",
    order: {
      customer: {},
      shipping_address: { name: "John Doe\n+1 (234) 567-8901" },
      billing_address: {}
    },
    expected: "+1(234)567-8901"
  },
  {
    name: "Multiple phone numbers in name (should get first)",
    order: {
      customer: {},
      shipping_address: { name: "John Doe\n+1234567890 or +0987654321" },
      billing_address: {}
    },
    expected: "+1234567890"
  }
];

console.log("Running comprehensive phone number extraction tests...\n");

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

console.log(`\nResults: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log("✅ All tests passed! Phone number extraction logic is working correctly.");
} else {
  console.log("❌ Some tests failed. Please review the implementation.");
}