// Script to analyze the actual structure of Shopify orders and phone number locations
// Usage: node scripts/analyzeShopifyOrderStructure.js

const { MongoClient } = require('mongodb');
const ShopifyClient = require('../services/shopifyClient');

async function main() {
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
    
    // Get a few recent orders from database
    const orders = await db.collection('orders').find({ source: 'shopify' })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();
    
    console.log("Analyzing Shopify order structure...\n");
    
    for (const dbOrder of orders) {
      console.log(`Order ID: ${dbOrder.shopifyOrderId}`);
      console.log(`Order Number: ${dbOrder.orderNumber}`);
      console.log(`Source: ${dbOrder.source}`);
      console.log(`Database Customer Phone: ${dbOrder.customerPhone || "null"}`);
      
      try {
        // Fetch complete order data from Shopify
        const shopifyOrder = await shopifyClient.getOrder(dbOrder.shopifyOrderId);
        
        console.log("\nShopify Order Structure:");
        console.log(`  Customer Object: ${shopifyOrder.customerPhone ? "Has phone" : "No phone"}`);
        console.log(`  Customer First Name: ${shopifyOrder.customerName || "null"}`);
        console.log(`  Customer Email: ${shopifyOrder.customerEmail || "null"}`);
        
        if (shopifyOrder.shippingAddress) {
          console.log(`  Shipping Address Phone: ${shopifyOrder.shippingAddress.phone || "null"}`);
          console.log(`  Shipping Address Name: ${shopifyOrder.shippingAddress.name || "null"}`);
          console.log(`  Shipping Address First Name: ${shopifyOrder.shippingAddress.first_name || "null"}`);
          console.log(`  Shipping Address Last Name: ${shopifyOrder.shippingAddress.last_name || "null"}`);
        } else {
          console.log("  No Shipping Address");
        }
        
        if (shopifyOrder.billingAddress) {
          console.log(`  Billing Address Phone: ${shopifyOrder.billingAddress.phone || "null"}`);
          console.log(`  Billing Address Name: ${shopifyOrder.billingAddress.name || "null"}`);
          console.log(`  Billing Address First Name: ${shopifyOrder.billingAddress.first_name || "null"}`);
          console.log(`  Billing Address Last Name: ${shopifyOrder.billingAddress.last_name || "null"}`);
        } else {
          console.log("  No Billing Address");
        }
        
        // Check where we could extract phone numbers from
        console.log("\nPhone Number Sources:");
        if (shopifyOrder.customerPhone) {
          console.log(`  ✅ Customer Object: ${shopifyOrder.customerPhone}`);
        }
        if (shopifyOrder.shippingAddress?.phone) {
          console.log(`  ✅ Shipping Address: ${shopifyOrder.shippingAddress.phone}`);
        }
        if (shopifyOrder.billingAddress?.phone) {
          console.log(`  ✅ Billing Address: ${shopifyOrder.billingAddress.phone}`);
        }
        
        // Determine which phone number would be used
        let phoneNumberUsed = null;
        let phoneSource = null;
        
        if (shopifyOrder.customerPhone) {
          phoneNumberUsed = shopifyOrder.customerPhone;
          phoneSource = "customer object";
        } else if (shopifyOrder.shippingAddress?.phone) {
          phoneNumberUsed = shopifyOrder.shippingAddress.phone;
          phoneSource = "shipping address";
        } else if (shopifyOrder.billingAddress?.phone) {
          phoneNumberUsed = shopifyOrder.billingAddress.phone;
          phoneSource = "billing address";
        }
        
        console.log(`\nPhone Number Used: ${phoneNumberUsed || "None"}`);
        if (phoneNumberUsed) {
          console.log(`Phone Source: ${phoneSource}`);
        }
        
        // Compare with database
        if (dbOrder.customerPhone && phoneNumberUsed) {
          console.log(`Database vs Shopify Match: ${dbOrder.customerPhone === phoneNumberUsed ? "✅ YES" : "❌ NO"}`);
        }
        
      } catch (error) {
        console.log(`  Error fetching order: ${error.message}`);
      }
      
      console.log("\n" + "=".repeat(50) + "\n");
    }
    
    await client.close();
    console.log("Analysis completed!");
  } catch (error) {
    console.error("Error analyzing Shopify order structure:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}