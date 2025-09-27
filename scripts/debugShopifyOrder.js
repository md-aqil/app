// Script to debug the actual structure of a Shopify order
// Usage: node scripts/debugShopifyOrder.js <shopifyOrderId>

const { MongoClient } = require('mongodb');
const ShopifyClient = require('../services/shopifyClient');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node scripts/debugShopifyOrder.js <shopifyOrderId>');
    console.log('Example: node scripts/debugShopifyOrder.js 6986088743062');
    process.exit(1);
  }
  
  const shopifyOrderId = args[0];
  
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
    
    console.log(`Fetching raw order data for order ${shopifyOrderId}...`);
    
    // Make a direct API call to get the raw order data
    const response = await shopifyClient.makeRequest(`/orders/${shopifyOrderId}.json`);
    
    console.log("\nRaw Shopify Order Data:");
    console.log(JSON.stringify(response.order, null, 2));
    
    // Analyze the structure
    const order = response.order;
    
    console.log("\n\nOrder Analysis:");
    console.log(`Order ID: ${order.id}`);
    console.log(`Order Number: ${order.order_number}`);
    
    // Check customer object
    console.log("\nCustomer Object:");
    if (order.customer) {
      console.log(`  First Name: ${order.customer.first_name || "null"}`);
      console.log(`  Last Name: ${order.customer.last_name || "null"}`);
      console.log(`  Email: ${order.customer.email || "null"}`);
      console.log(`  Phone: ${order.customer.phone || "null"}`);
    } else {
      console.log("  No customer object");
    }
    
    // Check shipping address
    console.log("\nShipping Address:");
    if (order.shipping_address) {
      console.log(`  First Name: ${order.shipping_address.first_name || "null"}`);
      console.log(`  Last Name: ${order.shipping_address.last_name || "null"}`);
      console.log(`  Name: ${order.shipping_address.name || "null"}`);
      console.log(`  Phone: ${order.shipping_address.phone || "null"}`);
    } else {
      console.log("  No shipping address");
    }
    
    // Check billing address
    console.log("\nBilling Address:");
    if (order.billing_address) {
      console.log(`  First Name: ${order.billing_address.first_name || "null"}`);
      console.log(`  Last Name: ${order.billing_address.last_name || "null"}`);
      console.log(`  Name: ${order.billing_address.name || "null"}`);
      console.log(`  Phone: ${order.billing_address.phone || "null"}`);
    } else {
      console.log("  No billing address");
    }
    
    // Check if there are phone numbers in any of these locations
    console.log("\nPhone Number Locations:");
    if (order.customer?.phone) {
      console.log(`  ✅ Customer Phone: ${order.customer.phone}`);
    }
    if (order.shipping_address?.phone) {
      console.log(`  ✅ Shipping Address Phone: ${order.shipping_address.phone}`);
    }
    if (order.billing_address?.phone) {
      console.log(`  ✅ Billing Address Phone: ${order.billing_address.phone}`);
    }
    
    if (!order.customer?.phone && !order.shipping_address?.phone && !order.billing_address?.phone) {
      console.log("  ❌ No phone numbers found in any location");
    }
    
    await client.close();
  } catch (error) {
    console.error("Error debugging Shopify order:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}