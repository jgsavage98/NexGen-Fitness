// Manual test to trigger individual chat automation for message ID 193
import { storage } from './server/storage.js';
import { aiCoach } from './server/openai.js';

async function triggerIndividualChatAutomation() {
  console.log('🧪 Manually triggering individual chat automation for message ID 193');
  
  try {
    // Get the user message
    const userId = '2xw8uz6udre';
    const message = "so how am I doing, now that you have my recent data?";
    
    console.log(`Processing message from user ${userId}: "${message}"`);
    
    // Get user profile
    const user = await storage.getUser(userId);
    console.log('User found:', user ? 'Yes' : 'No');
    
    // Get chat history
    const chatHistory = await storage.getUserChatMessages(userId, 10);
    console.log('Chat history length:', chatHistory.length);
    
    // Gather comprehensive client data
    console.log(`🔍 Gathering data for user ${userId}...`);
    const [macroTargets, recentMacros, progressEntries, todaysWorkout] = await Promise.all([
      storage.getUserMacroTargets(userId, new Date()),
      storage.getRecentMacros(userId, 7),
      storage.getUserProgressEntries(userId),
      storage.getTodaysWorkout(userId)
    ]);
    
    console.log(`📊 Data retrieved for ${userId}:`, {
      macroTargets: macroTargets ? 'Found' : 'None',
      recentMacrosCount: recentMacros?.length || 0,
      progressEntriesCount: progressEntries?.length || 0,
      todaysWorkout: todaysWorkout ? 'Found' : 'None'
    });
    
    // Show recent macros data
    if (recentMacros && recentMacros.length > 0) {
      console.log('Recent macros data:');
      recentMacros.forEach((macro, index) => {
        console.log(`  ${index + 1}. Date: ${macro.date}, Calories: ${macro.extractedCalories}, Protein: ${macro.extractedProtein}g`);
      });
    }
    
    // Build enhanced user profile
    const enhancedUserProfile = {
      ...user,
      macroTargets,
      recentMacros,
      progressEntries: progressEntries.slice(-5),
      todaysWorkout,
      workoutHistory: []
    };
    
    // Generate AI response
    console.log('🤖 Generating AI response...');
    const response = await aiCoach.getChatResponse(
      message,
      enhancedUserProfile,
      chatHistory,
      false, // isPendingApproval
      false  // isGroupChat flag
    );
    
    console.log('AI Response generated:');
    console.log('  Confidence:', response.confidence);
    console.log('  Message:', response.message.substring(0, 200) + '...');
    
    if (response.confidence >= 5) {
      // Save AI response
      console.log('💾 Saving AI response to database...');
      const aiResponse = await storage.saveChatMessage({
        userId: 'coach_chassidy',
        message: response.message,
        isAI: true,
        chatType: 'individual',
        status: 'approved',
        metadata: {
          confidence: response.confidence,
          requiresHumanReview: response.requiresHumanReview,
          suggestedActions: response.suggestedActions,
          senderName: 'Coach Chassidy',
          targetUserId: userId,
          isAutomated: true,
          urgentResponse: false
        }
      });
      
      console.log('✅ AI response saved with ID:', aiResponse.id);
      console.log('Full AI response:', response.message);
    } else {
      console.log('❌ AI response confidence too low:', response.confidence);
    }
    
  } catch (error) {
    console.error('❌ Error in manual trigger test:', error);
  }
}

// Run the test
triggerIndividualChatAutomation();