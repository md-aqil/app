// Test script to verify WhatsApp webhook handler import and export

const { handleWhatsAppWebhook } = require('../routes/webhook/whatsapp');

console.log('Testing WhatsApp webhook handler import...');

if (typeof handleWhatsAppWebhook === 'function') {
  console.log('✅ handleWhatsAppWebhook is properly exported as a function');
} else {
  console.log('❌ handleWhatsAppWebhook is not a function:', typeof handleWhatsAppWebhook);
  console.log('Value:', handleWhatsAppWebhook);
}

// Test the module exports
const whatsappModule = require('../routes/webhook/whatsapp');
console.log('\nModule exports:');
console.log('Keys:', Object.keys(whatsappModule));

Object.keys(whatsappModule).forEach(key => {
  console.log(`  ${key}: ${typeof whatsappModule[key]}`);
});