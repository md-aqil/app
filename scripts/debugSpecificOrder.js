// Script to debug a specific order's phone number extraction
// Usage: node scripts/debugSpecificOrder.js <orderId>

const { MongoClient } = require('mongodb');
const config = require('../config');
const { getCustomerPhone, getCustomerName } = require('../routes/webhook/shopify');

async function debugOrder(orderId) {
  console.log(`Debugging phone number extraction for order ${orderId}...\n`);
  
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || config.mongodb.url;
    const dbName = process.env.DB_NAME || config.mongodb.dbName;
    
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
    
    // Get the specific order from database
    const dbOrder = await db.collection('orders').findOne({ 
      $or: [
        { shopifyOrderId: orderId.toString() },
        { "order.id": orderId.toString() }
      ]
    });
    
    if (!dbOrder) {
      console.log(`Order ${orderId} not found in database`);
    } else {
      console.log("Order found in database:");
      console.log(`Order ID: ${dbOrder.shopifyOrderId}`);
      console.log(`Customer Name: ${dbOrder.customerName}`);
      console.log(`Customer Phone: ${dbOrder.customerPhone || "NULL"}`);
      console.log(`Customer Email: ${dbOrder.customerEmail || "NULL"}`);
      console.log(`Source: ${dbOrder.source}`);
      console.log(`Status: ${dbOrder.status}`);
    }
    
    // Try to fetch from Shopify directly to get complete data
    console.log("\nAttempting to fetch complete order data directly from Shopify...");
    const ShopifyClient = require('../services/shopifyClient');
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    try {
      const shopifyOrder = await shopifyClient.getOrder(orderId);
      console.log("\nComplete order data from Shopify:");
      console.log(JSON.stringify(shopifyOrder, null, 2));
      
      // Debug phone number extraction
      debugPhoneNumberExtraction(shopifyOrder);
      
      // Also show the data as it would be saved to database
      console.log("\n=== How this order would be saved to database ===");
      const orderData = {
        id: `shopify-${shopifyOrder.id}`,
        userId: 'default',
        shopifyOrderId: shopifyOrder.id.toString(),
        orderNumber: shopifyOrder.orderNumber,
        customerName: getCustomerName(shopifyOrder),
        customerEmail: shopifyOrder.customerEmail,
        customerPhone: getCustomerPhone(shopifyOrder),
        total: shopifyOrder.total,
        currency: shopifyOrder.currency,
        financialStatus: shopifyOrder.financialStatus,
        fulfillmentStatus: shopifyOrder.fulfillmentStatus,
        lineItems: shopifyOrder.lineItems || [],
        source: 'shopify',
        status: shopifyOrder.financialStatus || 'created',
        createdAt: shopifyOrder.createdAt,
        updatedAt: shopifyOrder.updatedAt
      };
      
      console.log("Order data that would be saved:");
      console.log(JSON.stringify(orderData, null, 2));
      
    } catch (error) {
      console.error("Failed to fetch order from Shopify:", error.message);
    }
    
    await client.close();
  } catch (error) {
    console.error("Error debugging order:", error.message);
  }
}

function debugPhoneNumberExtraction(order) {
  console.log("\n=== Phone Number Extraction Debug ===");
  
  // Check customer object
  console.log("Customer object:");
  if (order.customer) {
    console.log(`  ID: ${order.customer.id}`);
    console.log(`  First Name: ${order.customer.first_name}`);
    console.log(`  Last Name: ${order.customer.last_name}`);
    console.log(`  Email: ${order.customer.email}`);
    console.log(`  Phone: ${order.customer.phone || "NULL"}`);
  } else {
    console.log("  No customer object found");
  }
  
  // Check shipping address
  console.log("\nShipping Address:");
  if (order.shipping_address) {
    console.log(`  First Name: ${order.shipping_address.first_name}`);
    console.log(`  Last Name: ${order.shipping_address.last_name}`);
    console.log(`  Name: ${order.shipping_address.name || "NULL"}`);
    console.log(`  Phone: ${order.shipping_address.phone || "NULL"}`);
    console.log(`  Address1: ${order.shipping_address.address1}`);
    console.log(`  Address2: ${order.shipping_address.address2 || "NULL"}`);
  } else {
    console.log("  No shipping address found");
  }
  
  // Check billing address
  console.log("\nBilling Address:");
  if (order.billing_address) {
    console.log(`  First Name: ${order.billing_address.first_name}`);
    console.log(`  Last Name: ${order.billing_address.last_name}`);
    console.log(`  Name: ${order.billing_address.name || "NULL"}`);
    console.log(`  Phone: ${order.billing_address.phone || "NULL"}`);
    console.log(`  Address1: ${order.billing_address.address1}`);
    console.log(`  Address2: ${order.billing_address.address2 || "NULL"}`);
  } else {
    console.log("  No billing address found");
  }
  
  // Try our enhanced phone extraction
  console.log("\n=== Enhanced Phone Number Extraction ===");
  const extractedPhone = getCustomerPhone(order);
  console.log(`Extracted Phone: ${extractedPhone || "NULL"}`);
  
  if (extractedPhone) {
    console.log(`✅ Phone number found: ${extractedPhone}`);
  } else {
    console.log(`❌ No phone number found`);
    
    // Try to find any phone-like patterns in the data
    console.log("\n=== Looking for phone-like patterns ===");
    const orderString = JSON.stringify(order);
    const phonePatterns = orderString.match(/[\+]?[\d\s\-\(\)]{10,}/g);
    if (phonePatterns) {
      console.log("Found potential phone patterns:");
      phonePatterns.forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern}`);
      });
    } else {
      console.log("No phone-like patterns found in order data");
    }
  }
}

// Run the script
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scripts/debugSpecificOrder.js <orderId>');
  console.log('Example: node scripts/debugSpecificOrder.js 6986263429270');
  process.exit(1);
}

const orderId = args[0];
debugOrder(orderId);