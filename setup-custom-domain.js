const fs = require('fs');
const path = require('path');

// Script to set up a custom domain for the application
function setupCustomDomain(domain) {
  const envPath = path.join(__dirname, '.env');
  
  // Read the current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Ensure the domain has the proper protocol
  const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  
  // Update the NEXT_PUBLIC_BASE_URL with the custom domain
  envContent = envContent.replace(
    /NEXT_PUBLIC_BASE_URL=.*/g,
    `NEXT_PUBLIC_BASE_URL=${fullUrl}`
  );
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('Custom domain setup successfully!');
  console.log(`Webhook URLs will now use: ${fullUrl}`);
  console.log(`Shopify Webhook URL: ${fullUrl}/api/webhook/shopify`);
  console.log(`WhatsApp Webhook URL: ${fullUrl}/api/webhook/whatsapp`);
  
  return fullUrl;
}

// If this script is run directly
if (require.main === module) {
  // Get domain from command line arguments
  const domain = process.argv[2];
  if (domain) {
    setupCustomDomain(domain);
  } else {
    console.error('Please provide a domain as an argument');
    console.log('Usage: node setup-custom-domain.js your-domain.com');
    process.exit(1);
  }
}

module.exports = { setupCustomDomain };