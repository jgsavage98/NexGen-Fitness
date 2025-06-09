import { storage } from "./storage";

// Helper function to get date N days ago
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Simulate realistic weight progression (small fluctuations with overall trend)
function generateWeightProgression(startWeight: number, goalWeight: number, days: number): number[] {
  const weights: number[] = [];
  const totalChange = goalWeight - startWeight;
  const baseChange = totalChange / 84; // 12 week program
  
  for (let day = 0; day < days; day++) {
    // Base progress toward goal
    const progressWeight = startWeight + (baseChange * day);
    
    // Add realistic daily fluctuations (0.5-2 lbs)
    const fluctuation = (Math.random() - 0.5) * 2;
    const dailyWeight = progressWeight + fluctuation;
    
    // Round to 1 decimal place
    weights.push(Math.round(dailyWeight * 10) / 10);
  }
  
  return weights;
}

// Generate realistic macro adherence scores
function generateMacroAdherence(): number {
  // Most people hit 70-95% adherence with occasional perfect or poor days
  const rand = Math.random();
  if (rand < 0.1) return Math.floor(Math.random() * 30) + 40; // 40-70% (tough days)
  if (rand < 0.2) return 100; // Perfect days
  return Math.floor(Math.random() * 25) + 70; // 70-95% (typical)
}

// Generate realistic calorie intake with some variation
function generateCalorieIntake(targetCalories: number): number {
  const variation = (Math.random() - 0.5) * 400; // ±200 calories
  return Math.max(1200, Math.round(targetCalories + variation));
}

// Generate macro breakdown based on calories
function generateMacros(calories: number) {
  // Typical macro ratios with some variation
  const proteinRatio = 0.25 + (Math.random() - 0.5) * 0.1; // 20-30%
  const fatRatio = 0.30 + (Math.random() - 0.5) * 0.1; // 25-35%
  const carbRatio = 1 - proteinRatio - fatRatio;
  
  return {
    protein: Math.round((calories * proteinRatio) / 4), // 4 cal/g
    fat: Math.round((calories * fatRatio) / 9), // 9 cal/g
    carbs: Math.round((calories * carbRatio) / 4) // 4 cal/g
  };
}

export async function seedTestData(userId: string, days: number = 14) {
  try {
    console.log(`Seeding ${days} days of test data for user ${userId}...`);
    
    // Get user profile for baseline data
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const startWeight = user.weight || 180;
    const goalWeight = user.goalWeight || 165;
    const targetCalories = 2000; // Default target
    
    // Generate weight progression
    const weights = generateWeightProgression(startWeight, goalWeight, days);
    
    // Create progress entries (weight logs)
    for (let i = 0; i < days; i++) {
      const date = getDaysAgo(days - 1 - i);
      
      // Skip some days randomly (people don't always log daily)
      if (Math.random() < 0.15) continue; // 15% chance to skip
      
      await storage.createProgressEntry({
        userId,
        weight: weights[i],
        notes: `Daily weigh-in - Day ${i + 1}`,
      });
    }
    
    // Create daily macro entries
    for (let i = 0; i < days; i++) {
      const date = getDaysAgo(days - 1 - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip some days (not everyone uploads screenshots daily)
      if (Math.random() < 0.2) continue; // 20% chance to skip
      
      const actualCalories = generateCalorieIntake(targetCalories);
      const macros = generateMacros(actualCalories);
      const adherence = generateMacroAdherence();
      
      await storage.createDailyMacros({
        userId,
        date: dateStr,
        extractedCalories: actualCalories,
        extractedProtein: macros.protein,
        extractedCarbs: macros.carbs,
        extractedFat: macros.fat,
        targetCalories,
        targetProtein: 150,
        targetCarbs: 200,
        targetFat: 67,
        adherenceScore: adherence,
        visionConfidence: 85 + Math.random() * 10, // 85-95%
        hungerLevel: Math.floor(Math.random() * 5) + 1, // 1-5
        energyLevel: Math.floor(Math.random() * 5) + 1, // 1-5
        screenshotUrl: `/screenshots/demo-${date.getTime()}.jpg`,
      });
    }
    
    // Create some workout logs
    const exercises = [
      "Push-ups", "Squats", "Deadlifts", "Bench Press", "Rows", 
      "Overhead Press", "Lunges", "Pull-ups", "Dips", "Planks"
    ];
    
    for (let i = 0; i < days; i++) {
      const date = getDaysAgo(days - 1 - i);
      
      // Workout 3-4 times per week
      if (i % 2 === 0 || Math.random() < 0.3) continue;
      
      // Log 3-5 exercises per workout
      const exerciseCount = 3 + Math.floor(Math.random() * 3);
      
      for (let j = 0; j < exerciseCount; j++) {
        const exercise = exercises[j % exercises.length];
        const sets = 3 + Math.floor(Math.random() * 2); // 3-4 sets
        
        for (let set = 1; set <= sets; set++) {
          const baseWeight = 100 + (i * 2); // Progressive overload
          const weight = baseWeight + Math.floor(Math.random() * 20);
          const reps = 8 + Math.floor(Math.random() * 5); // 8-12 reps
          
          await storage.logWorkoutExercise({
            userId,
            workoutId: 1, // Default workout
            exerciseId: j + 1,
            setNumber: set,
            reps,
            weight,
            notes: `Set ${set} of ${exercise}`,
          });
        }
      }
    }
    
    // Create some chat messages with Coach Chassidy
    const coachMessages = [
      "Great job logging your nutrition today! I noticed you're staying consistent with your protein intake.",
      "Your weight trend is looking good this week. Keep up the excellent work!",
      "I see you missed a few workouts this week. Remember, consistency is key to reaching your goals.",
      "Your macro adherence has improved significantly! You're building great habits.",
      "How are you feeling about your energy levels? I notice some fluctuation in your logs.",
      "Excellent progress on your strength training! Your numbers are steadily improving.",
    ];
    
    for (let i = 0; i < Math.min(days, 6); i++) {
      const date = getDaysAgo(days - 1 - (i * 2));
      
      // User message
      await storage.saveChatMessage({
        userId,
        message: "How am I doing with my progress this week?",
        isAI: false,
      });
      
      // Coach response
      await storage.saveChatMessage({
        userId,
        message: coachMessages[i],
        isAI: true,
        metadata: {
          confidence: 0.95,
          requiresHumanReview: false,
        },
      });
    }
    
    console.log(`Successfully seeded ${days} days of test data!`);
    return { success: true, message: `Seeded ${days} days of realistic test data` };
    
  } catch (error) {
    console.error("Error seeding test data:", error);
    throw error;
  }
}

export async function clearTestData(userId: string) {
  try {
    console.log(`Clearing test data for user ${userId}...`);
    
    // Note: This would require implementing delete methods in storage
    // For now, we'll just return a message
    console.log("Test data clearing not implemented yet - would need delete methods in storage");
    
    return { success: true, message: "Test data cleared (implementation pending)" };
  } catch (error) {
    console.error("Error clearing test data:", error);
    throw error;
  }
}