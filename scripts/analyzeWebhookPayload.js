// Script to analyze Shopify webhook payloads for phone number information
// This script will help us understand where phone numbers are located in the actual webhook data

const { MongoClient } = require('mongodb');

// Enhanced phone number extraction function with detailed logging
function analyzeCustomerPhone(order) {
  console.log("\n--- Phone Number Analysis ---");
  console.log(`Order ID: ${order.id}`);
  console.log(`Order Number: ${order.order_number}`);
  
  // Check customer object
  if (order.customer) {
    console.log(`Customer object exists`);
    if (order.customer.phone) {
      console.log(`✅ Found phone in customer object: ${order.customer.phone}`);
      return { phone: order.customer.phone, source: "customer_object" };
    } else {
      console.log(`❌ No phone in customer object`);
    }
  } else {
    console.log(`❌ No customer object`);
  }
  
  // Check shipping address
  if (order.shipping_address) {
    console.log(`Shipping address exists`);
    if (order.shipping_address.phone) {
      console.log(`✅ Found phone in shipping address: ${order.shipping_address.phone}`);
      return { phone: order.shipping_address.phone, source: "shipping_address" };
    } else {
      console.log(`❌ No phone in shipping address`);
    }
    
    // Check for phone in shipping address name
    if (order.shipping_address.name) {
      console.log(`Shipping address name: "${order.shipping_address.name}"`);
      const phoneMatch = order.shipping_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
      if (phoneMatch) {
        const cleanPhone = phoneMatch[0].replace(/\s+/g, '');
        console.log(`✅ Found phone in shipping address name: ${cleanPhone}`);
        return { phone: cleanPhone, source: "shipping_address_name" };
      } else {
        console.log(`❌ No phone pattern found in shipping address name`);
      }
    }
  } else {
    console.log(`❌ No shipping address`);
  }
  
  // Check billing address
  if (order.billing_address) {
    console.log(`Billing address exists`);
    if (order.billing_address.phone) {
      console.log(`✅ Found phone in billing address: ${order.billing_address.phone}`);
      return { phone: order.billing_address.phone, source: "billing_address" };
    } else {
      console.log(`❌ No phone in billing address`);
    }
    
    // Check for phone in billing address name
    if (order.billing_address.name) {
      console.log(`Billing address name: "${order.billing_address.name}"`);
      const phoneMatch = order.billing_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
      if (phoneMatch) {
        const cleanPhone = phoneMatch[0].replace(/\s+/g, '');
        console.log(`✅ Found phone in billing address name: ${cleanPhone}`);
        return { phone: cleanPhone, source: "billing_address_name" };
      } else {
        console.log(`❌ No phone pattern found in billing address name`);
      }
    }
  } else {
    console.log(`❌ No billing address`);
  }
  
  console.log(`❌ No phone number found in any location`);
  return { phone: null, source: "none" };
}

// Function to get recent orders from database and analyze them
async function analyzeRecentOrders() {
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
    
    // Get recent Shopify orders from database
    const orders = await db.collection('orders').find({ source: 'shopify' })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`Found ${orders.length} recent Shopify orders in database`);
    
    let ordersWithPhone = 0;
    let ordersWithoutPhone = 0;
    
    for (const dbOrder of orders) {
      console.log(`\n=== Analyzing Order ${dbOrder.shopifyOrderId} ===`);
      
      // Use our enhanced analysis function
      const result = analyzeCustomerPhone({
        id: dbOrder.shopifyOrderId,
        order_number: dbOrder.orderNumber,
        customer: { phone: dbOrder.customerPhone },
        shipping_address: dbOrder.shippingAddress,
        billing_address: dbOrder.billingAddress
      });
      
      if (result.phone) {
        ordersWithPhone++;
        console.log(`✅ Order has phone number from ${result.source}`);
      } else {
        ordersWithoutPhone++;
        console.log(`❌ Order has no phone number`);
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Orders with phone numbers: ${ordersWithPhone}`);
    console.log(`Orders without phone numbers: ${ordersWithoutPhone}`);
    console.log(`Success rate: ${((ordersWithPhone / (ordersWithPhone + ordersWithoutPhone)) * 100).toFixed(1)}%`);
    
    await client.close();
  } catch (error) {
    console.error("Error analyzing orders:", error.message);
  }
}

// Run the analysis
analyzeRecentOrders();