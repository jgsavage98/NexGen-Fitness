// Quick verification script to test web app connectivity
const https = require('https');

const url = 'https://ai-companion-jgsavage98.replit.app';

console.log('🔍 Verifying web app connectivity...');
console.log(`📡 Testing: ${url}`);

https.get(url, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`🔗 Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  if (res.statusCode === 200) {
    console.log('🎉 Success! Web app is accessible');
    console.log('📱 Your iOS app will load this web app perfectly');
  } else {
    console.log('⚠️ Web app returned non-200 status');
  }
}).on('error', (err) => {
  console.error('❌ Connection failed:', err.message);
});