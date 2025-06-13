const fetch = require('node-fetch');

async function testAISettingsSave() {
  const baseUrl = 'http://localhost:5173';
  
  try {
    console.log('🧪 Testing AI Settings Save Functionality...');
    
    // First, get current settings
    console.log('📡 Fetching current AI settings...');
    const getResponse = await fetch(`${baseUrl}/api/trainer/ai-settings`, {
      headers: {
        'Authorization': 'Bearer replit_user_coach_chassidy'
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch settings: ${getResponse.status}`);
    }
    
    const currentSettings = await getResponse.json();
    console.log('✅ Current settings fetched successfully');
    console.log('📋 Individual chat content moderation enabled:', currentSettings.individualChat?.contentModeration?.enabled);
    
    // Modify settings to test save
    const testSettings = {
      ...currentSettings,
      individualChat: {
        ...currentSettings.individualChat,
        contentModeration: {
          enabled: true,
          profanityFilter: true,
          rudenessDetection: true,
          offTopicWarning: true,
          customKeywords: ["test", "spam", "promotion"],
          fitnessStrictness: 8,
          autoRedirect: true
        }
      }
    };
    
    console.log('💾 Testing settings save with content moderation updates...');
    
    // Save updated settings
    const saveResponse = await fetch(`${baseUrl}/api/trainer/ai-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer replit_user_coach_chassidy',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSettings)
    });
    
    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      throw new Error(`Failed to save settings: ${saveResponse.status} - ${errorText}`);
    }
    
    const saveResult = await saveResponse.json();
    console.log('✅ Settings saved successfully:', saveResult.message);
    
    // Verify settings were saved
    console.log('🔍 Verifying saved settings...');
    const verifyResponse = await fetch(`${baseUrl}/api/trainer/ai-settings`, {
      headers: {
        'Authorization': 'Bearer replit_user_coach_chassidy'
      }
    });
    
    const verifiedSettings = await verifyResponse.json();
    console.log('✅ Settings verification complete');
    console.log('📋 Updated fitness strictness:', verifiedSettings.individualChat?.contentModeration?.fitnessStrictness);
    console.log('📋 Custom keywords:', verifiedSettings.individualChat?.contentModeration?.customKeywords);
    
    console.log('🎉 AI Settings save test completed successfully!');
    
  } catch (error) {
    console.error('❌ AI Settings save test failed:', error.message);
    throw error;
  }
}

testAISettingsSave();