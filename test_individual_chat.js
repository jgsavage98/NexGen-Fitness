import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5173';
const TEST_USER_TOKEN = 'Bearer test-token-john'; // Test user token
const COACH_TOKEN = 'Bearer test-token-coach'; // Coach token

async function testIndividualChatAutomation() {
  console.log('🤖 Testing Individual Chat Automation System...\n');

  try {
    // Test 1: Send individual chat message as user
    console.log('1. Sending individual chat message as user John...');
    const messageResponse = await fetch(`${BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TEST_USER_TOKEN
      },
      body: JSON.stringify({
        message: "Hey Coach Chassidy, I'm feeling really motivated today and want to push myself harder in my workout. What do you think about adding some extra cardio?",
        chatType: 'individual'
      })
    });

    if (messageResponse.ok) {
      const result = await messageResponse.json();
      console.log('✅ Message sent successfully');
      console.log(`   User message ID: ${result.userMessage?.id}`);
    } else {
      console.log('❌ Failed to send message');
      const error = await messageResponse.text();
      console.log(`   Error: ${error}`);
    }

    // Test 2: Check AI settings for individual chat automation
    console.log('\n2. Checking AI settings for individual chat automation...');
    const settingsResponse = await fetch(`${BASE_URL}/api/trainer/ai-settings`, {
      method: 'GET',
      headers: {
        'Authorization': COACH_TOKEN
      }
    });

    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('✅ AI settings retrieved');
      console.log(`   Individual chat enabled: ${settings.individualChat?.enabled}`);
      console.log(`   Auto response: ${settings.individualChat?.autoResponse}`);
      console.log(`   Confidence threshold: ${settings.individualChat?.confidenceThreshold}`);
      console.log(`   Response delay: ${settings.individualChat?.responseDelay?.minSeconds}-${settings.individualChat?.responseDelay?.maxSeconds}s`);
      console.log(`   Quiet hours multiplier: ${settings.individualChat?.responseDelay?.quietHoursMultiplier}x`);
      console.log(`   Weekend multiplier: ${settings.individualChat?.responseDelay?.weekendMultiplier}x`);
    } else {
      console.log('❌ Failed to get AI settings');
    }

    // Test 3: Send urgent message to test immediate response
    console.log('\n3. Sending urgent message to test immediate response...');
    const urgentResponse = await fetch(`${BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TEST_USER_TOKEN
      },
      body: JSON.stringify({
        message: "Help! I think I might have injured my back during my workout. What should I do?",
        chatType: 'individual'
      })
    });

    if (urgentResponse.ok) {
      const result = await urgentResponse.json();
      console.log('✅ Urgent message sent successfully');
      console.log(`   Message ID: ${result.userMessage?.id}`);
    } else {
      console.log('❌ Failed to send urgent message');
    }

    // Test 4: Wait for automated responses
    console.log('\n4. Waiting 10 seconds to check for automated responses...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test 5: Check recent chat messages
    console.log('\n5. Checking recent chat messages for automated responses...');
    const chatResponse = await fetch(`${BASE_URL}/api/trainer/recent-chats`, {
      method: 'GET',
      headers: {
        'Authorization': COACH_TOKEN
      }
    });

    if (chatResponse.ok) {
      const chats = await chatResponse.json();
      console.log('✅ Chat messages retrieved');
      
      const aiMessages = chats.filter(chat => chat.isAI);
      console.log(`   Total AI messages found: ${aiMessages.length}`);
      
      aiMessages.forEach((msg, index) => {
        console.log(`   AI Message ${index + 1}:`);
        console.log(`     Content: "${msg.content.substring(0, 100)}..."`);
        console.log(`     Confidence: ${msg.metadata?.confidence}/10`);
        console.log(`     Automated: ${msg.metadata?.isAutomated}`);
        console.log(`     Urgent response: ${msg.metadata?.urgentResponse}`);
        console.log(`     Chat type: ${msg.chatType}`);
      });
    } else {
      console.log('❌ Failed to get chat messages');
    }

    console.log('\n🏁 Individual Chat Automation Test Complete!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testIndividualChatAutomation();