import fetch from 'node-fetch';

async function testAIAccuracy() {
  console.log('🧪 Testing AI Response Accuracy for Individual Chat');
  console.log('Testing if AI makes false claims about workout progress...\n');

  const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
    `https://${process.env.REPLIT_DEV_DOMAIN}` : 
    'http://localhost:5000';

  // Test 1: Send John's question about progress
  const testMessage = {
    message: "How am I doing so far?",
    chatType: "individual"
  };

  try {
    console.log('📤 Sending test message:', testMessage.message);
    
    const response = await fetch(`${baseUrl}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 2xw8uz6udre'
      },
      body: JSON.stringify(testMessage)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Message sent successfully');
    console.log('💬 User message ID:', result.id);

    // Wait for AI automation to process
    console.log('\n⏳ Waiting 30 seconds for AI automation to respond...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Fetch recent messages to see AI response
    const messagesResponse = await fetch(`${baseUrl}/api/chat/messages?chatType=individual`, {
      headers: {
        'Authorization': 'Bearer 2xw8uz6udre'
      }
    });

    const messages = await messagesResponse.json();
    
    // Find the latest AI response
    const aiResponses = messages
      .filter(msg => msg.isAI && msg.chatType === 'individual')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (aiResponses.length === 0) {
      console.log('❌ No AI response found');
      return;
    }

    const latestAIResponse = aiResponses[0];
    console.log('\n🤖 Latest AI Response:');
    console.log('📝 Message:', latestAIResponse.message);
    console.log('🎯 Confidence:', latestAIResponse.metadata?.confidence || 'N/A');

    // Analyze response for accuracy issues
    const response_text = latestAIResponse.message.toLowerCase();
    const problematicPhrases = [
      'consistent with your workouts',
      'consistent with workouts', 
      'workout consistency',
      'workout progress',
      'completed workouts',
      'finished workouts',
      'workout completion',
      'you\'ve been doing great with workouts',
      'keep up the workout routine'
    ];

    console.log('\n🔍 Accuracy Analysis:');
    
    let foundIssues = [];
    problematicPhrases.forEach(phrase => {
      if (response_text.includes(phrase)) {
        foundIssues.push(phrase);
      }
    });

    if (foundIssues.length > 0) {
      console.log('❌ ACCURACY ISSUES FOUND:');
      foundIssues.forEach(issue => {
        console.log(`   - Contains: "${issue}"`);
      });
      console.log('\n🚨 AI is making false claims about workout progress!');
    } else {
      console.log('✅ No problematic workout claims found');
      
      // Check if response appropriately focuses on available data
      const goodIndicators = [
        'nutrition',
        'macro',
        'food',
        'eating',
        'calorie',
        'protein',
        'carb',
        'fat'
      ];
      
      let foundGoodData = goodIndicators.some(indicator => 
        response_text.includes(indicator)
      );
      
      if (foundGoodData) {
        console.log('✅ Response appropriately focuses on nutrition data');
      } else {
        console.log('⚠️  Response may not be utilizing available nutrition data');
      }
    }

    // Show what data is actually available
    console.log('\n📊 Available Authentic Data for John:');
    console.log('   ✅ 3 days of nutrition uploads (June 9-11)');
    console.log('   ✅ 2 weight entries (178.9 lbs)');
    console.log('   ✅ User profile with goals and injuries');
    console.log('   ❌ NO workout completion logs');
    console.log('   ❌ NO workout consistency data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAIAccuracy().catch(console.error);