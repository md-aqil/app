// Script to test the enhanced phone number extraction logic with actual Shopify order data
// This version includes extraction from name fields where phone numbers might be stored

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

// Test with the actual order data from the issue (simplified)
const sampleOrder = {
  "id": 6986178298006,
  "order_number": 1022,
  "customer": {
    "first_name": "Monika",
    "last_name": "Arya",
    "email": "monikaarya2014@gmail.com"
    // Note: No phone in customer object in this case
  },
  "shipping_address": {
    "first_name": "Monika",
    "last_name": "Arya",
    "name": "Monika Arya\n+917210562014", // Phone number in name field
    "address1": "D - 154, opposite to Geeta Bhawan, Block D, Kamla Nagar",
    "address2": "",
    "city": "delhi",
    "province": "DL",
    "country": "India",
    "zip": "110007"
    // Note: No phone field in shipping address in this case
  },
  "billing_address": {
    "first_name": "Monika",
    "last_name": "Arya",
    "name": "Monika Arya\n+917210562014", // Phone number in name field
    "address1": "D - 154, opposite to Geeta Bhawan, Block D, Kamla Nagar",
    "address2": "",
    "city": "delhi",
    "province": "DL",
    "country": "India",
    "zip": "110007"
    // Note: No phone field in billing address in this case
  }
};

console.log("Testing enhanced phone number extraction...");
console.log("Order ID:", sampleOrder.id);
console.log("Order Number:", sampleOrder.order_number);

// Test our enhanced extraction function
const extractedPhone = getCustomerPhone(sampleOrder);
console.log("\nExtracted Phone:", extractedPhone);

if (extractedPhone) {
  console.log("✅ SUCCESS: Phone number found!");
  console.log("Phone number extracted from:", 
    sampleOrder.shipping_address.name.includes(extractedPhone) ? "shipping address name" :
    sampleOrder.billing_address.name.includes(extractedPhone) ? "billing address name" :
    "customer object");
} else {
  console.log("❌ FAILED: No phone number found");
}

// Test with normal case (phone in standard location)
const normalOrder = {
  "id": 12345,
  "order_number": 1001,
  "customer": {
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890"
  },
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe"
  },
  "billing_address": {
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe"
  }
};

console.log("\n\nTesting with normal order (phone in customer object)...");
const normalPhone = getCustomerPhone(normalOrder);
console.log("Extracted Phone:", normalPhone);
console.log(normalPhone ? "✅ SUCCESS: Phone number found!" : "❌ FAILED: No phone number found");