// Test script with a realistic Shopify order payload to verify phone number extraction

const { debugOrderPayload, extractCustomerPhone } = require('./debugWebhookPayload');

// Realistic Shopify order payload (based on the order details you provided)
const realOrderPayload = {
  "id": 6986178298006,
  "order_number": 1022,
  "customer": {
    "id": 7327615352982,
    "first_name": "Monika",
    "last_name": "Arya",
    "email": "monikaarya2014@gmail.com",
    "phone": null  // Note: Phone is null in customer object
  },
  "shipping_address": {
    "first_name": "Monika",
    "last_name": "Arya",
    "name": "Monika Arya",  // Phone number might be in the name field
    "address1": "D - 154, opposite to Geeta Bhawan, Block D, Kamla Nagar",
    "address2": "",
    "city": "delhi",
    "province": "DL",
    "country": "India",
    "zip": "110007",
    "phone": "+917210562014"  // Phone number is here
  },
  "billing_address": {
    "first_name": "Monika",
    "last_name": "Arya",
    "name": "Monika Arya",
    "address1": "D - 154, opposite to Geeta Bhawan, Block D, Kamla Nagar",
    "address2": "",
    "city": "delhi",
    "province": "DL",
    "country": "India",
    "zip": "110007",
    "phone": "+917210562014"  // Phone number is here too
  }
};

console.log("Testing phone number extraction with realistic Shopify order payload...\n");

// Test our debug function
const extractedPhone = debugOrderPayload(realOrderPayload);

if (extractedPhone) {
  console.log(`\n✅ SUCCESS: Phone number extracted: ${extractedPhone}`);
  
  // Verify it matches the expected phone number
  if (extractedPhone === "+917210562014") {
    console.log("✅ Phone number matches expected value");
  } else {
    console.log(`❌ Phone number mismatch. Expected: +917210562014, Got: ${extractedPhone}`);
  }
} else {
  console.log("\n❌ FAILED: No phone number found");
}

// Test with a case where phone is only in the name field
const orderWithNamePhone = {
  "id": 123456789,
  "order_number": 1001,
  "customer": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": null
  },
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe\n+1234567890",  // Phone number in name field
    "address1": "123 Main St",
    "address2": "",
    "city": "Anytown",
    "province": "CA",
    "country": "USA",
    "zip": "12345",
    "phone": null  // No phone in standard field
  },
  "billing_address": {
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe",
    "address1": "123 Main St",
    "address2": "",
    "city": "Anytown",
    "province": "CA",
    "country": "USA",
    "zip": "12345",
    "phone": null  // No phone in standard field
  }
};

console.log("\n\nTesting with phone number only in name field...\n");
const namePhone = debugOrderPayload(orderWithNamePhone);

if (namePhone) {
  console.log(`\n✅ SUCCESS: Phone number extracted from name field: ${namePhone}`);
} else {
  console.log("\n❌ FAILED: No phone number found in name field");
}