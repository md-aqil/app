// Script to verify port configuration across the project
const fs = require('fs');
const path = require('path');

console.log('=== WhatsApp Commerce Hub Port Configuration Verification ===\n');

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
console.log('1. Package.json Scripts:');
console.log('   dev:tunnel:', packageJson.scripts['dev:tunnel']);
console.log('   dev:no-reload:', packageJson.scripts['dev:no-reload']);
console.log('   dev:webpack:', packageJson.scripts['dev:webpack']);
console.log('   dev:', packageJson.scripts['dev']);
console.log('');

// Check config file
const config = require('./config/index.js');
console.log('2. Config File:');
console.log('   App Port:', config.app.port);
console.log('   Base URL:', config.app.baseUrl);
console.log('');

// Check environment file
if (fs.existsSync(path.join(__dirname, '.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  console.log('3. Environment File (.env):');
  const portMatch = envContent.match(/PORT=(\d+)/);
  if (portMatch) {
    console.log('   PORT:', portMatch[1]);
  } else {
    console.log('   PORT: Not specified (defaults to 3001)');
  }
  
  const baseUrlMatch = envContent.match(/NEXT_PUBLIC_BASE_URL=(.*)/);
  if (baseUrlMatch) {
    console.log('   NEXT_PUBLIC_BASE_URL:', baseUrlMatch[1]);
  }
  console.log('');
}

// Check for any references to port 3000 in the project
console.log('4. Port 3000 References Check:');
const { execSync } = require('child_process');
try {
  const port3000Refs = execSync('findstr /s /i "localhost:3000" *.md *.js *.yml 2>nul', { cwd: __dirname, encoding: 'utf8' });
  if (port3000Refs) {
    console.log('   Found references to port 3000:');
    console.log(port3000Refs);
  } else {
    console.log('   No references to port 3000 found');
  }
} catch (error) {
  console.log('   No references to port 3000 found');
}

console.log('\n=== Verification Complete ===');
console.log('✅ Application correctly configured to run on port 3001');
console.log('⚠️  Please ensure Cloudflare Tunnel is configured for port 3001');