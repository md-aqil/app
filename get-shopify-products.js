// Script to get real Shopify products and variants
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function getShopifyProducts() {
  console.log('Connecting to MongoDB...');
  
  try {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db(process.env.DB_NAME);
    
    // Get Shopify integration settings
    console.log('\nGetting Shopify integration settings...');
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    
    if (!integrations?.shopify?.shopDomain || !integrations?.shopify?.accessToken) {
      console.log('Shopify not configured');
      return;
    }
    
    // Fetch products from Shopify
    console.log('\nFetching products from Shopify...');
    const url = `https://${integrations.shopify.shopDomain}/admin/api/2023-10/products.json`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': integrations.shopify.accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('Failed to fetch products:', data);
      return;
    }
    
    console.log(`Found ${data.products.length} products:`);
    
    // Display first 3 products with their variants
    for (let i = 0; i < Math.min(3, data.products.length); i++) {
      const product = data.products[i];
      console.log(`\n--- Product ${i + 1} ---`);
      console.log(`Title: ${product.title}`);
      console.log(`ID: ${product.id}`);
      
      if (product.variants && product.variants.length > 0) {
        console.log('Variants:');
        product.variants.forEach((variant, index) => {
          console.log(`  ${index + 1}. ${variant.title} - ID: ${variant.id}, Price: $${variant.price}, SKU: ${variant.sku || 'N/A'}`);
        });
      }
    }
    
    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

getShopifyProducts();