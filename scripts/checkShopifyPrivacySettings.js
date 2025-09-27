// Script to check Shopify store privacy settings and API permissions

const ShopifyClient = require('../services/shopifyClient');
const { MongoClient } = require('mongodb');
const config = require('../config');

async function checkShopifyPrivacySettings() {
  console.log("=== Checking Shopify Privacy Settings and API Permissions ===\n");
  
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
    
    // Test 1: Check shop information
    console.log("\n=== Shop Information ===");
    try {
      const shopResponse = await shopifyClient.makeRequest('/shop.json');
      console.log("✅ Successfully accessed shop information");
      console.log(`Shop Name: ${shopResponse.shop.name}`);
      console.log(`Shop Domain: ${shopResponse.shop.myshopify_domain}`);
      console.log(`Email: ${shopResponse.shop.email}`);
    } catch (error) {
      console.log("❌ Failed to access shop information:", error.message);
    }
    
    // Test 2: Check API access scopes
    console.log("\n=== Checking API Access Scopes ===");
    try {
      // This endpoint might not be available, but let's try
      const scopesResponse = await shopifyClient.makeRequest('/oauth/access_scopes.json');
      console.log("✅ Successfully accessed API scopes");
      console.log("Available scopes:");
      scopesResponse.access_scopes.forEach(scope => {
        console.log(`  - ${scope.handle}`);
      });
    } catch (error) {
      console.log("⚠️  Could not check API scopes directly:", error.message);
      console.log("This is normal as this endpoint may not be accessible with private apps");
    }
    
    // Test 3: Check a few orders in detail
    console.log("\n=== Detailed Order Analysis ===");
    try {
      const ordersResponse = await shopifyClient.makeRequest('/orders.json?limit=5');
      console.log(`✅ Successfully fetched ${ordersResponse.orders.length} orders`);
      
      console.log("\nAnalyzing order data structure...");
      ordersResponse.orders.forEach((order, index) => {
        console.log(`\nOrder ${index + 1} (ID: ${order.id}):`);
        console.log(`  Customer Phone: ${order.customer?.phone ? 'PRESENT' : 'MISSING'}`);
        console.log(`  Shipping Phone: ${order.shipping_address?.phone ? 'PRESENT' : 'MISSING'}`);
        console.log(`  Billing Phone: ${order.billing_address?.phone ? 'PRESENT' : 'MISSING'}`);
        
        // Check if any addresses have names
        if (order.shipping_address?.name) {
          console.log(`  Shipping Name: ${order.shipping_address.name}`);
        }
        if (order.billing_address?.name) {
          console.log(`  Billing Name: ${order.billing_address.name}`);
        }
      });
    } catch (error) {
      console.log("❌ Failed to fetch orders:", error.message);
    }
    
    // Test 4: Check customers endpoint
    console.log("\n=== Customer Data Access ===");
    try {
      const customersResponse = await shopifyClient.makeRequest('/customers.json?limit=5');
      console.log(`✅ Successfully fetched ${customersResponse.customers.length} customers`);
      
      customersResponse.customers.forEach((customer, index) => {
        console.log(`\nCustomer ${index + 1}:`);
        console.log(`  Name: ${customer.first_name} ${customer.last_name}`);
        console.log(`  Email: ${customer.email || 'NULL'}`);
        console.log(`  Phone: ${customer.phone ? 'PRESENT' : 'MISSING'}`);
        console.log(`  Addresses: ${customer.addresses?.length || 0} addresses`);
        
        if (customer.addresses && customer.addresses.length > 0) {
          customer.addresses.forEach((address, addrIndex) => {
            console.log(`    Address ${addrIndex + 1} Phone: ${address.phone ? 'PRESENT' : 'MISSING'}`);
          });
        }
      });
    } catch (error) {
      console.log("⚠️  Could not access customers endpoint:", error.message);
    }
    
    // Test 5: Check if we can get more detailed order information
    console.log("\n=== Checking Order Detail Permissions ===");
    try {
      // Try to get a specific order with more fields
      const ordersResponse = await shopifyClient.makeRequest('/orders.json?limit=1');
      if (ordersResponse.orders.length > 0) {
        const orderId = ordersResponse.orders[0].id;
        console.log(`Checking detailed information for order ${orderId}...`);
        
        // Try with fields parameter to get more data
        const detailedOrderResponse = await shopifyClient.makeRequest(`/orders/${orderId}.json?fields=id,customer,shipping_address,billing_address,line_items`);
        console.log("✅ Successfully fetched detailed order information");
        
        const order = detailedOrderResponse.order;
        console.log("\nDetailed order structure:");
        console.log(`  Customer Object: ${order.customer ? 'PRESENT' : 'MISSING'}`);
        if (order.customer) {
          console.log(`    Customer Phone: ${order.customer.phone ? 'PRESENT' : 'MISSING'}`);
        }
        console.log(`  Shipping Address: ${order.shipping_address ? 'PRESENT' : 'MISSING'}`);
        if (order.shipping_address) {
          console.log(`    Shipping Phone: ${order.shipping_address.phone ? 'PRESENT' : 'MISSING'}`);
        }
        console.log(`  Billing Address: ${order.billing_address ? 'PRESENT' : 'MISSING'}`);
        if (order.billing_address) {
          console.log(`    Billing Phone: ${order.billing_address.phone ? 'PRESENT' : 'MISSING'}`);
        }
      }
    } catch (error) {
      console.log("⚠️  Could not fetch detailed order information:", error.message);
    }
    
    await client.close();
    console.log("\n=== Privacy Settings Check Complete ===");
    console.log("\nSummary:");
    console.log("- If customer phone numbers are consistently missing, this is likely due to Shopify's privacy settings");
    console.log("- Check your Shopify admin panel for privacy and data protection settings");
    console.log("- Ensure your API access token has the necessary permissions");
    console.log("- Consider reaching out to Shopify support if this is unexpected");
    
  } catch (error) {
    console.error("❌ Error during privacy settings check:", error.message);
  }
}

// Run the script
checkShopifyPrivacySettings();