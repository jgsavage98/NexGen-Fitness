// Test script for content moderation with private messaging
const fetch = require('node-fetch');

async function testContentModeration() {
  const baseUrl = 'http://localhost:5173';
  
  // Test sending an off-topic message to group chat
  const offTopicMessage = {
    message: "Hey everyone, what's your favorite TV show? I'm binge watching Netflix tonight!",
    chatType: 'group'
  };
  
  try {
    console.log('Testing content moderation with off-topic message...');
    
    const response = await fetch(`${baseUrl}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(offTopicMessage)
    });
    
    const result = await response.json();
    console.log('Response:', result);
    
    if (result.privateMessage) {
      console.log('✓ Private warning message sent successfully');
    } else {
      console.log('- No private message detected');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testContentModeration();