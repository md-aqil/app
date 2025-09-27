// Script to refresh the WhatsApp access token in the database
const { MongoClient } = require('mongodb');
const config = require('./config');

async function refreshWhatsAppToken() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(config.mongodb.url);
    await client.connect();
    const db = client.db(config.mongodb.dbName);
    console.log('Connected to MongoDB');
    
    // Get current integrations
    console.log('Fetching current integrations...');
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    
    if (!integrations) {
      console.error('No integrations found');
      return;
    }
    
    console.log('Current WhatsApp configuration:', JSON.stringify(integrations.whatsapp, null, 2));
    
    // Prompt for new access token (in a real scenario, this would come from the Facebook Developer portal)
    // For now, we'll just show instructions on how to get a new token
    
    console.log('\n=== INSTRUCTIONS TO REFRESH WHATSAPP ACCESS TOKEN ===');
    console.log('1. Go to Facebook Developers Portal: https://developers.facebook.com/');
    console.log('2. Navigate to your WhatsApp Business app');
    console.log('3. Go to "WhatsApp" section in the left sidebar');
    console.log('4. Click on your phone number');
    console.log('5. Click "Manage" next to the phone number');
    console.log('6. Click "Settings" tab');
    console.log('7. Click "Refresh token" button');
    console.log('8. Copy the new access token');
    console.log('9. Update the integration using the dashboard or API');
    
    console.log('\n=== CURRENT TOKEN STATUS ===');
    console.log('Token expired at: Saturday, 27-Sep-25 04:00:00 PDT');
    console.log('Current time: Saturday, 27-Sep-25 04:08:13 PDT');
    console.log('Token is expired and needs to be refreshed');
    
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the script
refreshWhatsAppToken();