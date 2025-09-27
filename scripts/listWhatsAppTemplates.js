// Script to list available WhatsApp templates
// Usage: node scripts/listWhatsAppTemplates.js

const { MongoClient } = require('mongodb');
const config = require('../config');

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
    
    const phoneNumberId = integrations.whatsapp.phoneNumberId;
    const accessToken = integrations.whatsapp.accessToken;
    const apiVersion = config.whatsapp.apiVersion;
    const baseUrl = `${config.whatsapp.baseUrl}/${apiVersion}/${phoneNumberId}/message_templates`;
    
    console.log('Fetching WhatsApp templates...');
    
    // Fetch templates from WhatsApp API
    const response = await fetch(`${baseUrl}?limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to fetch WhatsApp templates:', data);
      throw new Error(`WhatsApp API error: ${data.error?.message || response.status}`);
    }
    
    if (!data.data || data.data.length === 0) {
      console.log('No templates found in WhatsApp Business account');
      await client.close();
      return;
    }
    
    console.log(`Found ${data.data.length} templates:`);
    
    data.data.forEach((template, index) => {
      console.log(`\n${index + 1}. Template Name: ${template.name}`);
      console.log(`   Status: ${template.status}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Language: ${template.language}`);
      
      if (template.components) {
        console.log(`   Components: ${template.components.length}`);
        template.components.forEach((component, compIndex) => {
          console.log(`     ${compIndex + 1}. Type: ${component.type}`);
          if (component.format) {
            console.log(`        Format: ${component.format}`);
          }
          if (component.text) {
            console.log(`        Text: ${component.text.substring(0, 50)}${component.text.length > 50 ? '...' : ''}`);
          }
        });
      }
    });
    
    await client.close();
    console.log('\nTemplate listing completed!');
  } catch (error) {
    console.error('Error listing WhatsApp templates:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}