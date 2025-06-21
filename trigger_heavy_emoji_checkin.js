/**
 * Test script to trigger heavy emoji weekly check-in for Angie
 */

async function triggerHeavyEmojiCheckin() {
  try {
    // Import the weekly scheduler
    const { weeklyCheckinScheduler } = await import('./server/weeklyCheckinScheduler.js');
    
    console.log('🎯 Triggering heavy emoji weekly check-in for Angie...');
    
    // Trigger check-in specifically for Angie
    await weeklyCheckinScheduler.triggerWeeklyCheckinNow('angie_varrecchio_001');
    
    console.log('✅ Heavy emoji weekly check-in triggered successfully!');
    console.log('📧 Check Angie\'s individual chat for the new enthusiastic message with heavy emoji usage (level 10)');
    
  } catch (error) {
    console.error('❌ Error triggering heavy emoji check-in:', error);
  }
}

// Run the test
triggerHeavyEmojiCheckin();