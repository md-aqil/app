// Comprehensive script to debug order phone number issues
// This script will check multiple aspects of the order processing

const { MongoClient } = require('mongodb');
const config = require('../config');
const { getCustomerPhone, getCustomerName } = require('../routes/webhook/shopify');
const ShopifyClient = require('../services/shopifyClient');

async function comprehensiveDebug(orderId) {
  console.log(`=== Comprehensive Debug for Order ${orderId} ===\n`);
  
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
      console.log("❌ No integrations found in database");
      await client.close();
      return;
    }
    
    console.log("✅ Database connection successful");
    console.log(`Shopify Domain: ${integrations.shopify.shopDomain}`);
    
    // Initialize Shopify client
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    // Fetch the order directly from Shopify
    console.log("\n=== Fetching Order from Shopify API ===");
    try {
      const shopifyOrder = await shopifyClient.getOrder(orderId);
      console.log("✅ Successfully fetched order from Shopify");
      
      // Display complete order structure
      console.log("\n--- Complete Order Structure ---");
      console.log(`Order ID: ${shopifyOrder.id}`);
      console.log(`Order Number: ${shopifyOrder.orderNumber}`);
      console.log(`Financial Status: ${shopifyOrder.financialStatus}`);
      console.log(`Created At: ${shopifyOrder.createdAt}`);
      
      // Check all order fields
      console.log("\n--- Order Fields Analysis ---");
      const orderFields = Object.keys(shopifyOrder);
      console.log("Available fields:", orderFields.join(', '));
      
      // Check customer information
      console.log("\n--- Customer Information ---");
      // Get the raw order data to see what's actually there
      const rawResponse = await shopifyClient.makeRequest(`/orders/${orderId}.json`);
      const rawOrder = rawResponse.order;
      
      console.log("Raw customer data:");
      if (rawOrder.customer) {
        console.log(`  ID: ${rawOrder.customer.id}`);
        console.log(`  First Name: ${rawOrder.customer.first_name || 'NULL'}`);
        console.log(`  Last Name: ${rawOrder.customer.last_name || 'NULL'}`);
        console.log(`  Email: ${rawOrder.customer.email || 'NULL'}`);
        console.log(`  Phone: ${rawOrder.customer.phone || 'NULL'}`);
      } else {
        console.log("  No customer object in raw data");
      }
      
      // Check shipping address
      console.log("\n--- Shipping Address ---");
      if (rawOrder.shipping_address) {
        const shippingFields = Object.keys(rawOrder.shipping_address);
        console.log(`  Available fields: ${shippingFields.join(', ')}`);
        console.log(`  First Name: ${rawOrder.shipping_address.first_name || 'NULL'}`);
        console.log(`  Last Name: ${rawOrder.shipping_address.last_name || 'NULL'}`);
        console.log(`  Name: ${rawOrder.shipping_address.name || 'NULL'}`);
        console.log(`  Phone: ${rawOrder.shipping_address.phone || 'NULL'}`);
        console.log(`  Address1: ${rawOrder.shipping_address.address1 || 'NULL'}`);
        console.log(`  Address2: ${rawOrder.shipping_address.address2 || 'NULL'}`);
      } else {
        console.log("  No shipping address in raw data");
      }
      
      // Check billing address
      console.log("\n--- Billing Address ---");
      if (rawOrder.billing_address) {
        const billingFields = Object.keys(rawOrder.billing_address);
        console.log(`  Available fields: ${billingFields.join(', ')}`);
        console.log(`  First Name: ${rawOrder.billing_address.first_name || 'NULL'}`);
        console.log(`  Last Name: ${rawOrder.billing_address.last_name || 'NULL'}`);
        console.log(`  Name: ${rawOrder.billing_address.name || 'NULL'}`);
        console.log(`  Phone: ${rawOrder.billing_address.phone || 'NULL'}`);
        console.log(`  Address1: ${rawOrder.billing_address.address1 || 'NULL'}`);
        console.log(`  Address2: ${rawOrder.billing_address.address2 || 'NULL'}`);
      } else {
        console.log("  No billing address in raw data");
      }
      
      // Phone number extraction analysis
      console.log("\n=== Phone Number Extraction Analysis ===");
      const extractedPhone = getCustomerPhone(rawOrder);
      console.log(`Extracted Phone: ${extractedPhone || 'NULL'}`);
      
      if (extractedPhone) {
        console.log("✅ Phone number successfully extracted");
      } else {
        console.log("❌ No phone number found");
        
        // Look for any phone-like patterns in the entire order
        console.log("\n--- Searching for phone-like patterns ---");
        const orderString = JSON.stringify(rawOrder, null, 2);
        const phonePatterns = orderString.match(/[\+]?[\d\s\-\(\)]{10,}/g);
        if (phonePatterns) {
          console.log("Found potential phone patterns:");
          const uniquePatterns = [...new Set(phonePatterns)]; // Remove duplicates
          uniquePatterns.forEach((pattern, index) => {
            // Filter out obvious non-phone numbers (like order IDs, timestamps, etc.)
            if (!pattern.includes('-') && pattern.length >= 10 && pattern.length <= 15) {
              console.log(`  ${index + 1}. ${pattern}`);
            }
          });
        } else {
          console.log("No phone-like patterns found");
        }
      }
      
      // Check recent orders for comparison
      console.log("\n=== Checking Recent Orders for Comparison ===");
      try {
        const recentOrders = await shopifyClient.getOrders();
        console.log(`Found ${recentOrders.length} recent orders`);
        
        // Look for orders with phone numbers
        const ordersWithPhones = recentOrders.filter(order => order.customerPhone);
        console.log(`Orders with phone numbers: ${ordersWithPhones.length}`);
        
        if (ordersWithPhones.length > 0) {
          console.log("\nSample orders with phone numbers:");
          ordersWithPhones.slice(0, 3).forEach((order, index) => {
            console.log(`  ${index + 1}. Order #${order.orderNumber} - ${order.customerPhone}`);
          });
        } else {
          console.log("No recent orders with phone numbers found");
        }
      } catch (error) {
        console.log("⚠️  Could not fetch recent orders:", error.message);
      }
      
    } catch (error) {
      console.log("❌ Failed to fetch order from Shopify:", error.message);
      return;
    }
    
    await client.close();
    console.log("\n=== Debug Complete ===");
    
  } catch (error) {
    console.error("❌ Error during comprehensive debug:", error.message);
  }
}

// Run the script
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scripts/comprehensiveOrderDebug.js <orderId>');
  console.log('Example: node scripts/comprehensiveOrderDebug.js 6986263429270');
  process.exit(1);
}

const orderId = args[0];
comprehensiveDebug(orderId);