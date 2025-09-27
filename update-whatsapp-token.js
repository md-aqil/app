// Script to update the WhatsApp access token in the database
const { MongoClient } = require('mongodb');
const config = require('./config');

// In a real scenario, you would get this token from the Facebook Developer portal
// For now, we'll use a placeholder to demonstrate the update process
const NEW_ACCESS_TOKEN = "YOUR_NEW_ACCESS_TOKEN_HERE"; // Replace with actual token

async function updateWhatsAppToken(newToken) {
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
    
    // Update the access token
    console.log('\nUpdating WhatsApp access token...');
    
    const updatedWhatsApp = {
      ...integrations.whatsapp,
      accessToken: newToken
    };
    
    await db.collection('integrations').updateOne(
      { userId: 'default' },
      { 
        $set: { 
          whatsapp: updatedWhatsApp,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('WhatsApp access token updated successfully!');
    
    // Verify the update
    const updatedIntegrations = await db.collection('integrations').findOne({ userId: 'default' });
    console.log('Updated WhatsApp configuration:', JSON.stringify(updatedIntegrations.whatsapp, null, 2));
    
  } catch (error) {
    console.error('Error updating token:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the script with the new token
if (require.main === module) {
  // Check if a token was provided as a command line argument
  const token = process.argv[2];
  
  if (token) {
    updateWhatsAppToken(token);
  } else {
    console.log('Usage: node update-whatsapp-token.js <new_access_token>');
    console.log('Please provide a new access token as a command line argument.');
    console.log('If you don\'t have a new token yet, follow these steps:');
    console.log('1. Go to Facebook Developers Portal: https://developers.facebook.com/');
    console.log('2. Navigate to your WhatsApp Business app');
    console.log('3. Go to "WhatsApp" section in the left sidebar');
    console.log('4. Click on your phone number');
    console.log('5. Click "Manage" next to the phone number');
    console.log('6. Click "Settings" tab');
    console.log('7. Click "Refresh token" button');
    console.log('8. Copy the new access token');
    console.log('9. Run this script with the new token as an argument');
  }
}

module.exports = { updateWhatsAppToken };