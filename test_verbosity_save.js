async function testVerbositySave() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    console.log('🧪 Testing Verbosity Settings Save...');
    
    // Get current settings
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
    console.log('✅ Current settings fetched');
    console.log('📋 Group chat verbosity:', currentSettings.groupChat?.verbosity);
    console.log('📋 Individual chat verbosity:', currentSettings.individualChat?.verbosity);
    
    // Test changing verbosity from verbose to brief
    const testSettings = {
      ...currentSettings,
      groupChat: {
        ...currentSettings.groupChat,
        verbosity: 'brief'
      },
      individualChat: {
        ...currentSettings.individualChat,
        verbosity: 'brief'
      }
    };
    
    console.log('💾 Saving verbosity settings to "brief"...');
    
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
    console.log('✅ Settings saved:', saveResult.message);
    
    // Verify settings were saved
    console.log('🔍 Verifying saved settings...');
    const verifyResponse = await fetch(`${baseUrl}/api/trainer/ai-settings`, {
      headers: {
        'Authorization': 'Bearer replit_user_coach_chassidy'
      }
    });
    
    const verifiedSettings = await verifyResponse.json();
    console.log('✅ Settings verification complete');
    console.log('📋 Verified group chat verbosity:', verifiedSettings.groupChat?.verbosity);
    console.log('📋 Verified individual chat verbosity:', verifiedSettings.individualChat?.verbosity);
    
    if (verifiedSettings.groupChat?.verbosity === 'brief' && verifiedSettings.individualChat?.verbosity === 'brief') {
      console.log('🎉 Verbosity save test PASSED!');
    } else {
      console.log('❌ Verbosity save test FAILED - settings not persisted');
    }
    
  } catch (error) {
    console.error('❌ Verbosity save test failed:', error.message);
  }
}

// Run the test
testVerbositySave();