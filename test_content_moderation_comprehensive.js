import fetch from 'node-fetch';

async function testComprehensiveContentModeration() {
  const baseUrl = 'http://0.0.0.0:5173';
  
  const testMessages = [
    {
      type: 'off-topic',
      message: "Hey everyone, what's your favorite Netflix show?",
      description: 'Off-topic message about entertainment'
    },
    {
      type: 'rude', 
      message: "You're being stupid and annoying",
      description: 'Rude and mean message'
    },
    {
      type: 'profanity',
      message: "This damn workout is too fucking hard",
      description: 'Message with profanity'
    },
    {
      type: 'fitness-related',
      message: "I'm struggling with my protein intake today",
      description: 'On-topic fitness message (should not trigger moderation)'
    },
    {
      type: 'promotional',
      message: "Check out this amazing supplement promotion I found!",
      description: 'Promotional/spam message'
    }
  ];
  
  console.log('🧪 Testing Comprehensive Content Moderation System...');
  
  for (const test of testMessages) {
    try {
      console.log(`\n📝 Testing ${test.type}: "${test.message}"`);
      
      // Send message to group chat endpoint
      const response = await fetch(`${baseUrl}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer replit_user_2xw8uz6udre',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: test.message,
          chatType: 'group'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Failed to send message: ${response.status} - ${errorText}`);
        continue;
      }
      
      const result = await response.json();
      console.log(`✅ Message sent successfully`);
      
      // Wait a moment for moderation processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`📊 Expected: ${test.description}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${test.type}:`, error.message);
    }
  }
  
  console.log('\n🎉 Content moderation testing completed!');
  console.log('💡 Check the individual chat for John to see personalized private warnings');
  console.log('💡 Check the group chat for any automated reminders');
}

testComprehensiveContentModeration();