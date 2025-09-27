// Script to check Shopify app permissions
// Usage: node scripts/checkShopifyAppPermissions.js

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
      throw new Error('No integrations found in database');
    }
    
    // Initialize Shopify client
    const shopifyClient = new ShopifyClient(
      integrations.shopify.shopDomain,
      integrations.shopify.accessToken
    );
    
    console.log('Checking Shopify app permissions...\n');
    
    // Try to get information about the current access token
    try {
      // Note: This endpoint might not exist, but let's try
      const accessScope = await shopifyClient.makeRequest('/oauth/access_scopes.json');
      console.log('✅ Successfully accessed OAuth scopes');
      console.log('Available scopes:');
      accessScope.access_scopes.forEach(scope => {
        console.log(`  - ${scope.handle}: ${scope.description}`);
      });
    } catch (error) {
      console.log('ℹ️  Could not access OAuth scopes directly (this is normal for some Shopify setups)');
      console.log(`Error: ${error.message}`);
    }
    
    // Try to get application information
    try {
      const appInfo = await shopifyClient.makeRequest('/apps.json');
      console.log('\n✅ Successfully accessed app information');
      console.log(`Found ${appInfo.apps.length} apps`);
      
      // Look for our app
      const ourApp = appInfo.apps.find(app => 
        app.title.includes('WhatsApp') || app.title.includes('whatsapp') || 
        app.title.includes('Suvanya') || app.title.includes('suvanya')
      );
      
      if (ourApp) {
        console.log(`\nOur App Information:`);
        console.log(`  Title: ${ourApp.title}`);
        console.log(`  API Key: ${ourApp.api_key}`);
        console.log(`  Status: ${ourApp.status}`);
      }
    } catch (error) {
      console.log('\nℹ️  Could not access app information directly');
      console.log(`Error: ${error.message}`);
    }
    
    // Check what data we can access through different endpoints
    console.log('\nChecking data access permissions...');
    
    // Test orders access
    try {
      const ordersTest = await shopifyClient.makeRequest('/orders.json?limit=1');
      console.log('✅ Orders access: Granted');
    } catch (error) {
      console.log('❌ Orders access: Denied');
      console.log(`  Error: ${error.message}`);
    }
    
    // Test customers access
    try {
      const customersTest = await shopifyClient.makeRequest('/customers.json?limit=1');
      console.log('✅ Customers access: Granted');
    } catch (error) {
      console.log('❌ Customers access: Denied');
      console.log(`  Error: ${error.message}`);
    }
    
    // Test check if we can access more detailed customer information
    try {
      const customers = await shopifyClient.makeRequest('/customers.json?limit=5');
      if (customers.customers.length > 0) {
        const customerId = customers.customers[0].id;
        const customerDetail = await shopifyClient.makeRequest(`/customers/${customerId}.json`);
        console.log('✅ Detailed customer access: Granted');
      } else {
        console.log('ℹ️  No customers to test detailed access');
      }
    } catch (error) {
      console.log('❌ Detailed customer access: Denied');
      console.log(`  Error: ${error.message}`);
    }
    
    await client.close();
    console.log('\nShopify app permissions check completed!');
    
    console.log('\n📝 Recommendations:');
    console.log('1. Check your Shopify app settings in the Shopify Partner Dashboard');
    console.log('2. Ensure the app has the necessary permissions for reading customer data');
    console.log('3. Check if there are any privacy settings in Shopify that restrict PII access');
    console.log('4. Verify that the access token has the required scopes');
  } catch (error) {
    console.error('Error checking Shopify app permissions:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}