// Script to generate the WhatsApp checkout button code with current configuration
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function generateCheckoutButtonCode() {
  try {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db(process.env.DB_NAME);
    
    // Get integration settings
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    
    const whatsappNumber = integrations?.whatsapp?.phoneNumberId || '917210562014';
    const shopDomain = integrations?.shopify?.shopDomain || 'f26jad-va.myshopify.com';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lcsw.dpdns.org';
    
    console.log('\n=== WhatsApp Checkout Button Configuration ===');
    console.log('YOUR_WHATSAPP_NUMBER:', whatsappNumber);
    console.log('YOUR_SHOPIFY_STORE_URL:', shopDomain);
    console.log('API_ENDPOINT:', `${baseUrl}/api/whatsapp-checkout`);
    
    await client.close();
  } catch (error) {
    console.error('Error generating checkout button code:', error.message);
  }
}

generateCheckoutButtonCode();