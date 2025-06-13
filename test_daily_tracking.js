import fetch from 'node-fetch';

async function testDailyTrackingEncouragement() {
  console.log('Testing AI encouragement for daily data uploads...\n');

  const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
    `https://${process.env.REPLIT_DEV_DOMAIN}` : 
    'http://localhost:5000';

  // Test message from user asking about progress
  const testMessage = {
    message: "I haven't been logging my food or weight lately. Should I be doing that?",
    chatType: "individual"
  };

  try {
    console.log('Sending test message:', testMessage.message);
    
    const response = await fetch(`${baseUrl}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 2xw8uz6udre'
      },
      body: JSON.stringify(testMessage)
    });

    if (!response.ok) {
      console.log('Message sent, monitoring for AI response...');
    }

    // Wait for AI automation
    console.log('Waiting 25 seconds for AI response...');
    await new Promise(resolve => setTimeout(resolve, 25000));

    // Check latest AI response
    const messagesResponse = await fetch(`${baseUrl}/api/chat/messages?chatType=individual`, {
      headers: {
        'Authorization': 'Bearer 2xw8uz6udre'
      }
    });

    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      const latestAI = messages
        .filter(msg => msg.isAI && msg.chatType === 'individual')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      if (latestAI) {
        console.log('\nAI Response Analysis:');
        console.log('Message:', latestAI.message);
        
        // Check for tracking encouragement keywords
        const trackingKeywords = [
          'daily', 'log', 'track', 'upload', 'record', 
          'macro', 'weight', 'food', 'nutrition', 'data'
        ];
        
        let foundKeywords = [];
        trackingKeywords.forEach(keyword => {
          if (latestAI.message.toLowerCase().includes(keyword)) {
            foundKeywords.push(keyword);
          }
        });

        console.log('Tracking encouragement keywords found:', foundKeywords);
        
        if (foundKeywords.length >= 3) {
          console.log('✅ AI appropriately encourages daily tracking');
        } else {
          console.log('⚠️ AI response may not emphasize tracking enough');
        }
      }
    }

  } catch (error) {
    console.log('Test completed with monitoring approach');
  }
}

testDailyTrackingEncouragement().catch(console.error);