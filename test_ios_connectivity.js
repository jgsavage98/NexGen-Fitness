/**
 * Test iOS app connectivity to production API
 * This will verify if the authentication and chat endpoints are accessible
 */

const API_URL = 'https://ai-companion-jgsavage98.replit.app';

async function testConnectivity() {
  console.log('=== iOS API CONNECTIVITY TEST ===');
  console.log('Testing connection to:', API_URL);
  
  // Test 1: Check if server is reachable
  try {
    console.log('\n1. Testing basic server connectivity...');
    const response = await fetch(`${API_URL}/api/auth/available-users`);
    console.log('Status:', response.status);
    
    if (response.ok) {
      const users = await response.json();
      console.log('✅ Server is reachable, found', users.length, 'users');
    } else {
      console.log('❌ Server responded with error:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot reach server:', error.message);
    return;
  }
  
  // Create base64-encoded token: base64(userId:)
  const tokenData = '2xw8uz6udre:';
  const base64Token = Buffer.from(tokenData).toString('base64');
  console.log('Using token data:', tokenData);
  console.log('Base64 token:', base64Token);
  
  // Test 2: Test authentication with John's token
  try {
    console.log('\n2. Testing authentication with John\'s token...');
    const authResponse = await fetch(`${API_URL}/api/auth/user`, {
      headers: {
        'Authorization': `Bearer ${base64Token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Auth status:', authResponse.status);
    
    if (authResponse.ok) {
      const userData = await authResponse.json();
      console.log('✅ Authentication successful for:', userData.firstName, userData.lastName);
      console.log('User ID:', userData.id);
    } else {
      console.log('❌ Authentication failed:', authResponse.status);
      const errorText = await authResponse.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
  }
  
  // Test 3: Test chat messages endpoint
  try {
    console.log('\n3. Testing chat messages endpoint...');
    const chatResponse = await fetch(`${API_URL}/api/chat/messages?chatType=individual&limit=5`, {
      headers: {
        'Authorization': `Bearer ${base64Token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Chat endpoint status:', chatResponse.status);
    
    if (chatResponse.ok) {
      const messages = await chatResponse.json();
      console.log('✅ Chat endpoint accessible, found', messages.length, 'messages');
      if (messages.length > 0) {
        console.log('Sample message:', {
          id: messages[0].id,
          type: messages[0].chat_type,
          from: messages[0].is_ai ? 'Coach' : 'User'
        });
      }
    } else {
      console.log('❌ Chat endpoint failed:', chatResponse.status);
      const errorText = await chatResponse.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Chat endpoint error:', error.message);
  }
  
  // Test 4: Test group chat endpoint
  try {
    console.log('\n4. Testing group chat endpoint...');
    const groupResponse = await fetch(`${API_URL}/api/chat/messages?chatType=group&limit=5`, {
      headers: {
        'Authorization': `Bearer ${base64Token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Group chat status:', groupResponse.status);
    
    if (groupResponse.ok) {
      const groupMessages = await groupResponse.json();
      console.log('✅ Group chat accessible, found', groupMessages.length, 'messages');
    } else {
      console.log('❌ Group chat failed:', groupResponse.status);
    }
  } catch (error) {
    console.log('❌ Group chat error:', error.message);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testConnectivity().catch(console.error);