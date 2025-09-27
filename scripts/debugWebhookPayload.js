// Script to debug and log the actual Shopify webhook payload structure
// This will help us understand exactly where phone numbers are located

function debugOrderPayload(order) {
  console.log("=== Shopify Order Payload Debug ===");
  console.log("Order ID:", order.id);
  console.log("Order Number:", order.order_number);
  
  // Log customer information
  console.log("\n--- Customer Information ---");
  if (order.customer) {
    console.log("Customer ID:", order.customer.id);
    console.log("Customer First Name:", order.customer.first_name);
    console.log("Customer Last Name:", order.customer.last_name);
    console.log("Customer Email:", order.customer.email);
    console.log("Customer Phone:", order.customer.phone || "NULL");
  } else {
    console.log("No customer object found");
  }
  
  // Log shipping address information
  console.log("\n--- Shipping Address ---");
  if (order.shipping_address) {
    console.log("Shipping First Name:", order.shipping_address.first_name);
    console.log("Shipping Last Name:", order.shipping_address.last_name);
    console.log("Shipping Name:", order.shipping_address.name);
    console.log("Shipping Phone:", order.shipping_address.phone || "NULL");
    console.log("Shipping Address1:", order.shipping_address.address1);
    console.log("Shipping Address2:", order.shipping_address.address2 || "NULL");
  } else {
    console.log("No shipping address found");
  }
  
  // Log billing address information
  console.log("\n--- Billing Address ---");
  if (order.billing_address) {
    console.log("Billing First Name:", order.billing_address.first_name);
    console.log("Billing Last Name:", order.billing_address.last_name);
    console.log("Billing Name:", order.billing_address.name);
    console.log("Billing Phone:", order.billing_address.phone || "NULL");
    console.log("Billing Address1:", order.billing_address.address1);
    console.log("Billing Address2:", order.billing_address.address2 || "NULL");
  } else {
    console.log("No billing address found");
  }
  
  // Try our enhanced phone extraction
  console.log("\n--- Phone Number Extraction ---");
  const extractedPhone = extractCustomerPhone(order);
  console.log("Extracted Phone:", extractedPhone || "NULL");
  
  return extractedPhone;
}

// Enhanced phone number extraction function
function extractCustomerPhone(order) {
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

// Export for use in other modules
module.exports = {
  debugOrderPayload,
  extractCustomerPhone
};