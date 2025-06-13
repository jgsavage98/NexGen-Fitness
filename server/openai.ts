import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

// Vision extraction for MyFitnessPal screenshots
export interface NutritionExtraction {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  extractedText?: string;
  error?: string;
}

export async function extractNutritionFromScreenshot(imageBase64: string): Promise<NutritionExtraction> {
  try {
    console.log("Starting nutrition extraction with OpenAI Vision...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a nutrition data extraction specialist. Extract macro totals from MyFitnessPal day view screenshots.

CRITICAL REQUIREMENTS:
1. Look for macro breakdown showing Carbohydrates (Xg), Fat (Xg), Protein (Xg)
2. Extract the gram amounts in parentheses for each macro
3. Do NOT extract calories - set calories to null (it will be calculated from macros)
4. Return ONLY the JSON object, no other text
5. If any macro is unclear, set confidence < 0.95

JSON FORMAT (exact structure required):
{
  "calories": null,
  "protein": number (grams),
  "carbs": number (grams), 
  "fat": number (grams),
  "confidence": number (0-1),
  "extractedText": "Carbohydrates (Xg), Fat (Xg), Protein (Xg)"
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract nutrition totals from this MyFitnessPal screenshot. Focus on daily totals or remaining macros."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    console.log("OpenAI response received, parsing...");
    const rawContent = response.choices[0].message.content || '{}';
    console.log("Raw OpenAI response:", rawContent);
    
    const result = JSON.parse(rawContent);
    console.log("Parsed result:", result);
    
    // Calculate calories if missing but other macros are present
    let calculatedCalories = result.calories;
    if (!calculatedCalories && result.protein && result.carbs && result.fat) {
      // Standard macro-to-calorie conversion: 4 cal/g protein, 4 cal/g carbs, 9 cal/g fat
      calculatedCalories = (result.protein * 4) + (result.carbs * 4) + (result.fat * 9);
      console.log(`Calculated calories from macros: ${calculatedCalories}`);
    }
    
    // Validate extraction - need at least protein, carbs, fat
    if (!result.protein || !result.carbs || !result.fat) {
      console.log("Incomplete nutrition data extracted - missing essential macros");
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        confidence: 0,
        error: "Could not extract complete nutrition data"
      };
    }

    return {
      calories: Number(calculatedCalories) || 0,
      protein: Number(result.protein) || 0,
      carbs: Number(result.carbs) || 0,
      fat: Number(result.fat) || 0,
      confidence: Number(result.confidence) || 0,
      extractedText: result.extractedText || ""
    };

  } catch (error) {
    console.error("Vision extraction error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      confidence: 0,
      error: error instanceof Error ? error.message : "Vision processing failed"
    };
  }
}

export interface CoachResponse {
  message: string;
  confidence: number;
  requiresHumanReview: boolean;
  suggestedActions?: string[];
}

export interface ModerationResult {
  violationType: 'none' | 'off-topic' | 'profanity' | 'rude' | 'offensive' | 'inappropriate';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  reason: string;
  shouldWarn: boolean;
  privateWarning?: string;
  groupReminder?: string;
}

export interface WorkoutRecommendation {
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest: number;
    targetMuscles: string[];
    difficulty: string;
  }>;
  estimatedDuration: number;
  focus: string;
  notes?: string;
}

export interface MacroProposal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reasoning: string;
  requiresTrainerApproval: boolean;
  weightTrend?: number;
  adherenceScore?: number;
  programDay?: number;
}

export interface MacroRecommendation {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reasoning: string;
  adjustments?: string[];
}

// Enhanced content moderation function
export async function moderateContent(
  message: string, 
  clientFirstName: string,
  settings?: any
): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a content moderation specialist for a fitness and nutrition coaching platform. Analyze messages for violations and generate appropriate responses.

MODERATION CRITERIA:
1. OFF-TOPIC: Messages not related to fitness, nutrition, health, wellness, or coaching
2. PROFANITY: Explicit language, swear words, vulgar content
3. RUDE/MEAN: Hostile, aggressive, disrespectful, bullying behavior
4. OFFENSIVE: Discriminatory, hateful, inappropriate sexual content
5. INAPPROPRIATE: Spam, promotional content, personal attacks

SEVERITY LEVELS:
- LOW: Minor violations, gentle redirection needed
- MEDIUM: Clear violations requiring firm warning
- HIGH: Serious violations requiring immediate intervention

RESPONSE GENERATION:
- Private warnings should address the client by first name: "Hi ${clientFirstName},"
- Group reminders should be brief and encouraging
- Maintain Coach Chassidy's supportive but firm tone

Return JSON format:
{
  "violationType": "none|off-topic|profanity|rude|offensive|inappropriate",
  "severity": "low|medium|high",
  "confidence": 0.0-1.0,
  "reason": "specific explanation",
  "shouldWarn": boolean,
  "privateWarning": "personalized message to client",
  "groupReminder": "brief group chat reminder"
}`
        },
        {
          role: "user",
          content: `Analyze this message from client "${clientFirstName}": "${message}"`
        }
      ],
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      violationType: result.violationType || 'none',
      severity: result.severity || 'low',
      confidence: result.confidence || 0.8,
      reason: result.reason || '',
      shouldWarn: result.shouldWarn || false,
      privateWarning: result.privateWarning || '',
      groupReminder: result.groupReminder || ''
    };
  } catch (error) {
    console.error("Content moderation error:", error);
    return {
      violationType: 'none',
      severity: 'low',
      confidence: 0.5,
      reason: 'Moderation service unavailable',
      shouldWarn: false
    };
  }
}

export class AICoach {
  private getSystemPrompt(): string {
    return `You are Coach Chassidy, a certified personal trainer and nutrition specialist with 8+ years of experience. You communicate directly with your clients in a warm, supportive, and professional manner.

PERSONALITY AND COMMUNICATION STYLE:
- Use first person ("I", "my experience", "I recommend")
- Be encouraging, motivational, and personable
- Show genuine care for client progress
- Reference your expertise and certifications naturally
- Use coaching language, not AI assistant language

COACHING APPROACH:
- Focus on sustainable lifestyle changes
- Emphasize consistency over perfection
- Provide education alongside recommendations
- Consider individual circumstances and preferences
- Build confidence and accountability

DATA ACCURACY REQUIREMENTS:
- ONLY reference data that actually exists in the client context provided
- NEVER mention workout consistency, progress, or completion unless actual workout completion logs exist
- If no workout completion data exists, focus on nutrition data, goals, and encouragement for future workouts
- Do not assume or fabricate progress that cannot be verified from the provided data
- When data is missing, acknowledge gaps rather than making false claims

DAILY TRACKING EMPHASIS:
- When nutrition data is missing: Strongly encourage daily macro logging for program effectiveness
- When progress data is missing: Emphasize importance of daily weight and wellness tracking
- Explain that consistent data uploads are essential for personalized coaching and optimal results
- Be specific about what data would help: "uploading your daily macros," "logging your weight each morning"
- Connect data tracking to their specific goals and success

NEVER mention being an AI, assistant, or virtual coach. You ARE Coach Chassidy speaking directly to your client.`;
  }

  async calculateMacros(userProfile: any, recentMacros: any[], weightTrend: number, programDay: number): Promise<MacroProposal> {
    try {
      const context = this.buildMacroContext(userProfile, recentMacros, weightTrend, programDay);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user", 
            content: `As Coach Chassidy, calculate new macro targets for your client:

${context}

IMPORTANT: Ensure the macros mathematically add up to the total calories:
- Protein: 4 calories per gram
- Carbs: 4 calories per gram  
- Fat: 9 calories per gram
- Total should equal stated calories

Respond with JSON:
{
  "calories": number,
  "protein": number, 
  "carbs": number,
  "fat": number,
  "reasoning": "explanation from Coach Chassidy's perspective using 'I' statements",
  "requiresTrainerApproval": true,
  "weightTrend": number,
  "adherenceScore": number (0-100),
  "programDay": number
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for consistency
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      let calories = Number(result.calories) || 0;
      let protein = Number(result.protein) || 0;
      let carbs = Number(result.carbs) || 0;
      let fat = Number(result.fat) || 0;
      
      // Validate that macros add up to stated calories
      const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
      const calorieDiscrepancy = Math.abs(calculatedCalories - calories);
      
      // If discrepancy is more than 50 calories, adjust macros proportionally
      if (calorieDiscrepancy > 50) {
        console.log(`Macro calculation mismatch: ${calculatedCalories} vs ${calories}. Adjusting...`);
        
        // Adjust macros to match stated calories while maintaining ratios
        const proteinCalories = protein * 4;
        const carbCalories = carbs * 4;
        const fatCalories = fat * 9;
        const totalMacroCalories = proteinCalories + carbCalories + fatCalories;
        
        if (totalMacroCalories > 0) {
          const ratio = calories / totalMacroCalories;
          protein = Math.round(protein * ratio);
          carbs = Math.round(carbs * ratio);
          fat = Math.round(fat * ratio);
        }
      }
      
      return {
        calories,
        protein,
        carbs,
        fat,
        reasoning: result.reasoning || "Standard macro calculation",
        requiresTrainerApproval: true, // Always require approval
        weightTrend,
        adherenceScore: result.adherenceScore || 0,
        programDay
      };
    } catch (error) {
      console.error("Macro calculation error:", error);
      // Return conservative baseline if AI fails
      const bmr = this.calculateBMR(userProfile);
      const targetCalories = Math.round(bmr * 1.2); // Conservative sedentary multiplier
      
      // Calculate macros with proper mathematical consistency
      const protein = Math.round(userProfile.currentWeight * 2.2 * 0.8); // 0.8g per lb
      const proteinCalories = protein * 4;
      
      // Allocate remaining calories between carbs and fat (60% carbs, 40% fat)
      const remainingCalories = targetCalories - proteinCalories;
      const carbCalories = Math.round(remainingCalories * 0.6);
      const fatCalories = remainingCalories - carbCalories;
      
      const carbs = Math.round(carbCalories / 4);
      const fat = Math.round(fatCalories / 9);
      
      return {
        calories: targetCalories,
        protein,
        carbs,
        fat,
        reasoning: "Conservative baseline calculation - AI processing unavailable",
        requiresTrainerApproval: true,
        weightTrend,
        programDay
      };
    }
  }

  private buildMacroContext(userProfile: any, recentMacros: any[], weightTrend: number, programDay: number): string {
    const avgAdherence = recentMacros.length > 0 
      ? recentMacros.reduce((sum, day) => sum + (day.adherenceScore || 0), 0) / recentMacros.length
      : 0;
    
    const avgHunger = recentMacros.length > 0
      ? recentMacros.reduce((sum, day) => sum + (day.hungerLevel || 3), 0) / recentMacros.length
      : 3;

    return `CLIENT PROFILE:
- Current Weight: ${userProfile.currentWeight}kg
- Goal Weight: ${userProfile.goalWeight}kg  
- Height: ${userProfile.height}cm
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Activity: ${userProfile.activityLevel}
- Workout Frequency: ${userProfile.workoutFrequency}x/week

PROGRESS DATA:
- Program Day: ${programDay}/90
- Weight Trend: ${weightTrend}kg/week
- Avg Adherence: ${avgAdherence.toFixed(1)}%
- Avg Hunger Level: ${avgHunger.toFixed(1)}/5

RECENT MACRO HISTORY (last 7 days):
${recentMacros.slice(-7).map(day => 
  `${day.date}: ${day.extractedCalories || 0}cal, ${day.extractedProtein || 0}p, ${day.extractedCarbs || 0}c, ${day.extractedFat || 0}f (${day.adherenceScore || 0}% adherence, hunger: ${day.hungerLevel || 3}/5)`
).join('\n')}`;
  }

  private calculateBMR(userProfile: any): number {
    const { weight, height, age, gender } = userProfile;
    
    // Using Harris-Benedict equation with imperial units (pounds and inches)
    if (gender === 'male') {
      return 88.362 + (6.077 * weight) + (12.189 * height) - (5.677 * age);
    } else {
      return 447.593 + (4.194 * weight) + (7.869 * height) - (4.330 * age);
    }
  }

  async getChatResponse(
    userMessage: string, 
    userProfile: any, 
    conversationHistory: any[] = [],
    isPendingApproval: boolean = false,
    isGroupChat: boolean = false
  ): Promise<CoachResponse> {
    try {
      const context = this.buildUserContext(userProfile, isPendingApproval);
      
      // Format conversation history based on chat type
      let history = '';
      if (isGroupChat && Array.isArray(conversationHistory)) {
        history = conversationHistory.slice(-10).map(msg => 
          `${msg.sender}: ${msg.message}`
        ).join('\n');
      } else if (Array.isArray(conversationHistory)) {
        history = conversationHistory.slice(-10).join('\n');
      }

      const approvalContext = isPendingApproval 
        ? "\n\nIMPORTANT: This client is currently awaiting trainer approval for their personalized macro plan. You are currently reviewing their onboarding information and MyFitnessPal baseline data to create their customized nutrition targets. Let them know you're working on their plan and will have it ready soon. Be encouraging about the process and remind them that this personalized approach ensures the best results."
        : "";

      const groupChatContext = isGroupChat
        ? "\n\nYou are moderating a group chat with multiple clients. Provide supportive, encouraging responses that benefit the entire community. Address the specific message while keeping the conversation positive and motivational for all participants. Share general tips and encouragement that others can learn from."
        : "";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt() + `\n\nUser Context: ${context}${approvalContext}${groupChatContext}`,
          },
          {
            role: "user",
            content: `As Coach Chassidy, respond to your client. Conversation history:\n${history}\n\nCurrent message: ${userMessage}\n\nRespond with JSON in this format: { "message": "your personal response as Coach Chassidy", "confidence": 0.9, "requiresHumanReview": false, "suggestedActions": ["action1", "action2"] }`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        message: result.message || "I'm sorry, I couldn't process your request right now.",
        confidence: result.confidence || 0.5,
        requiresHumanReview: result.confidence < 0.7 || result.requiresHumanReview,
        suggestedActions: result.suggestedActions || [],
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      return {
        message: "I'm experiencing some technical difficulties. Please try again or contact support if the issue persists.",
        confidence: 0.0,
        requiresHumanReview: true,
      };
    }
  }

  async generateWorkoutRecommendation(
    userProfile: any,
    targetMuscleGroups?: string[],
    availableTime?: number
  ): Promise<WorkoutRecommendation> {
    try {
      const context = this.buildUserContext(userProfile, false); // Privacy-focused by default
      const constraints = this.buildWorkoutConstraints(targetMuscleGroups, availableTime, userProfile);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert fitness coach creating personalized workout plans. Focus on progressive overload, proper form, and user safety.",
          },
          {
            role: "user",
            content: `Create a workout recommendation for this user:
            
${context}

Constraints: ${constraints}

Respond with JSON in this format:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 3,
      "reps": "8-12",
      "rest": 60,
      "targetMuscles": ["chest", "shoulders"],
      "difficulty": "intermediate"
    }
  ],
  "estimatedDuration": 45,
  "focus": "Upper Body Strength",
  "notes": "Focus on controlled movements..."
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as WorkoutRecommendation;
    } catch (error) {
      console.error("Workout generation error:", error);
      // Return a basic fallback workout
      return {
        exercises: [
          {
            name: "Push-ups",
            sets: 3,
            reps: "8-12",
            rest: 60,
            targetMuscles: ["chest", "shoulders", "triceps"],
            difficulty: "beginner"
          }
        ],
        estimatedDuration: 30,
        focus: "Basic Strength",
        notes: "Start with this basic routine and we'll adjust based on your progress."
      };
    }
  }

  async calculateMacroTargets(userProfile: any): Promise<MacroRecommendation> {
    try {
      const context = this.buildUserContext(userProfile);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a nutrition expert calculating personalized macro targets based on user goals, activity level, and body composition.",
          },
          {
            role: "user",
            content: `Calculate macro targets for this user:

${context}

Use established formulas like Mifflin-St Jeor for BMR and Harris-Benedict for TDEE.

Respond with JSON in this format:
{
  "calories": 2000,
  "protein": 150,
  "carbs": 200,
  "fat": 65,
  "reasoning": "Based on your goal of muscle gain and moderate activity level...",
  "adjustments": ["Increase protein on workout days", "Cycle carbs around training"]
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as MacroRecommendation;
    } catch (error) {
      console.error("Macro calculation error:", error);
      // Return basic calculation based on simple formulas
      const { calories, protein, carbs, fat } = this.calculateBasicMacros(userProfile);
      return {
        calories,
        protein,
        carbs,
        fat,
        reasoning: "Basic calculation based on your profile. These targets will be refined as we learn more about your preferences and progress.",
        adjustments: ["Monitor your energy levels and adjust as needed"]
      };
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<{ text: string; duration?: number }> {
    try {
      // Create a temporary file-like object from buffer
      const audioFile = new File([audioBuffer], "audio.wav", { type: "audio/wav" });
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      return {
        text: transcription.text,
        duration: 0, // Duration not available from Whisper API
      };
    } catch (error) {
      console.error("Audio transcription error:", error);
      throw new Error("Failed to transcribe audio: " + (error as Error).message);
    }
  }

  private buildUserContext(userProfile: any, includePersonalData: boolean = true): string {
    if (!userProfile) return "No user profile available";

    let context = `
Client Profile:
- Name: ${userProfile.firstName || 'Client'} ${userProfile.lastName || ''}
- Goal: ${userProfile.goal || 'general fitness'}
- Age: ${userProfile.age || 'not specified'}
- Gender: ${userProfile.gender || 'not specified'}
- Height: ${userProfile.height || 'not specified'} cm
- Current Weight: ${userProfile.weight || 'not specified'} kg
- Activity Level: ${userProfile.activityLevel || 'not specified'}
- Movement Restrictions: ${userProfile.injuries?.join(', ') || 'none reported'}
- Available Equipment: ${userProfile.equipment?.join(', ') || 'bodyweight only'}`;

    // Add macro targets if available
    if (userProfile.macroTargets) {
      context += `

Current Macro Targets:
- Daily Calories: ${userProfile.macroTargets.calories || 'not set'}
- Protein: ${userProfile.macroTargets.protein || 'not set'}g
- Carbohydrates: ${userProfile.macroTargets.carbs || 'not set'}g
- Fat: ${userProfile.macroTargets.fat || 'not set'}g`;
    }

    // Add recent macro uploads (last 7 days)
    if (userProfile.recentMacros && userProfile.recentMacros.length > 0) {
      context += `

Recent Nutrition Data (Last 7 Days):`;
      userProfile.recentMacros.slice(0, 5).forEach((macro: any, index: number) => {
        const date = new Date(macro.date).toLocaleDateString();
        context += `
- ${date}: ${macro.calories || 0} cal, ${macro.protein || 0}g protein, ${macro.carbs || 0}g carbs, ${macro.fat || 0}g fat`;
      });
    } else {
      context += `

Recent Nutrition Data:
- No recent macro uploads available - client hasn't logged nutrition data recently
- PRIORITY: Emphasize importance of daily macro logging for program success`;
    }

    // Add recent progress entries
    if (userProfile.progressEntries && userProfile.progressEntries.length > 0) {
      context += `

Recent Progress Updates:`;
      userProfile.progressEntries.forEach((entry: any) => {
        const date = new Date(entry.recorded_at).toLocaleDateString();
        context += `
- ${date}: Weight ${entry.weight || 'not recorded'} lbs`;
        if (entry.notes) {
          context += `, Notes: ${entry.notes}`;
        }
      });
    } else {
      context += `

Recent Progress Updates:
- No recent weight or progress entries logged
- PRIORITY: Encourage daily weight and wellness tracking for optimal program results`;
    }

    // Add today's workout if available
    if (userProfile.todaysWorkout) {
      context += `

Today's Assigned Workout:
- Workout: ${userProfile.todaysWorkout.name || 'Unnamed workout'}`;
      if (userProfile.todaysWorkout.description) {
        context += `
- Description: ${userProfile.todaysWorkout.description}`;
      }
    }

    // Add assigned workout plans (NOT completion data)
    if (userProfile.workoutHistory && userProfile.workoutHistory.length > 0) {
      context += `

Assigned Workout Plans:`;
      userProfile.workoutHistory.forEach((workout: any) => {
        const date = new Date(workout.createdAt).toLocaleDateString();
        context += `
- ${date}: ${workout.name || 'Workout plan assigned'} (PLAN ONLY - no completion data logged)`;
      });
    }

    // Note about workout completion tracking
    context += `

IMPORTANT: This client has NO workout completion logs in the system. Do NOT mention workout consistency, progress, or completion unless actual completion data exists.`;

    return context.trim();
  }

  private buildWorkoutConstraints(
    targetMuscleGroups?: string[],
    availableTime?: number,
    userProfile?: any
  ): string {
    const constraints = [];
    
    if (targetMuscleGroups?.length) {
      constraints.push(`Target muscle groups: ${targetMuscleGroups.join(', ')}`);
    }
    
    if (availableTime) {
      constraints.push(`Available time: ${availableTime} minutes`);
    }
    
    if (userProfile?.injuries?.length) {
      constraints.push(`Avoid exercises that stress: ${userProfile.injuries.join(', ')}`);
    }
    
    if (userProfile?.equipment?.length) {
      constraints.push(`Available equipment: ${userProfile.equipment.join(', ')}`);
    } else {
      constraints.push("Bodyweight exercises only");
    }
    
    return constraints.length ? constraints.join('; ') : 'No specific constraints';
  }

  private calculateBasicMacros(userProfile: any): MacroRecommendation {
    // Basic BMR calculation using Harris-Benedict equation with imperial units
    const { weight = 154, height = 67, age = 30, gender = 'male', goal = 'maintenance', activityLevel = 'moderate' } = userProfile;
    
    // BMR calculation with imperial units (pounds and inches)
    let bmr: number;
    if (gender === 'male') {
      bmr = 88.362 + (6.077 * weight) + (12.189 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (4.194 * weight) + (7.869 * height) - (4.330 * age);
    }
    
    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    const tdee = bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55);
    
    // Adjust for goals
    let calories = tdee;
    if (goal === 'weight-loss') {
      calories = tdee - 500; // 1lb per week deficit
    } else if (goal === 'muscle-gain') {
      calories = tdee + 300; // Moderate surplus
    }
    
    // Macro distribution using imperial weight (pounds)
    const protein = weight * 1.0; // 1g per lb bodyweight
    const fat = calories * 0.25 / 9; // 25% of calories from fat
    const carbs = (calories - (protein * 4) - (fat * 9)) / 4; // Remaining calories from carbs
    
    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      reasoning: "Calculated using imperial units (pounds/inches)",
      adjustments: []
    };
  }

  async calculateHungerBasedMacroAdjustment(
    userProfile: any, 
    currentMacros: any, 
    hungerLevel: number
  ): Promise<MacroProposal> {
    try {
      console.log("Calculating hunger-based macro adjustment...");
      
      // Get current macro targets or use extracted macros
      const currentCalories = currentMacros.targetCalories || currentMacros.extractedCalories || 2000;
      const currentProtein = currentMacros.targetProtein || currentMacros.extractedProtein || 150;
      const currentCarbs = currentMacros.targetCarbs || currentMacros.extractedCarbs || 200;
      const currentFat = currentMacros.targetFat || currentMacros.extractedFat || 67;
      
      // Calculate current macro percentages
      const totalCurrentCalories = (currentProtein * 4) + (currentCarbs * 4) + (currentFat * 9);
      const proteinPercentage = (currentProtein * 4) / totalCurrentCalories;
      const carbPercentage = (currentCarbs * 4) / totalCurrentCalories;
      const fatPercentage = (currentFat * 9) / totalCurrentCalories;
      
      // Increase calories by 50 due to high hunger level
      const newCalories = currentCalories + 50;
      const additionalCalories = 50;
      
      // Distribute additional calories proportionally
      const additionalProteinCalories = additionalCalories * proteinPercentage;
      const additionalCarbCalories = additionalCalories * carbPercentage;
      const additionalFatCalories = additionalCalories * fatPercentage;
      
      // Convert back to grams
      const newProtein = Math.round(currentProtein + (additionalProteinCalories / 4));
      const newCarbs = Math.round(currentCarbs + (additionalCarbCalories / 4));
      const newFat = Math.round(currentFat + (additionalFatCalories / 9));
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are Coach Chassidy Escobedo, an expert fitness and nutrition coach. A client has reported a hunger level of ${hungerLevel}/5, indicating their metabolism may be heating up. You've calculated a 50-calorie increase distributed proportionally across their current macros.

Current macros: ${currentCalories} calories, ${currentProtein}g protein, ${currentCarbs}g carbs, ${currentFat}g fat
Proposed adjustment: ${newCalories} calories, ${newProtein}g protein, ${newCarbs}g carbs, ${newFat}g fat

Provide reasoning for this adjustment from your perspective as their coach. Explain why hunger level ${hungerLevel} indicates metabolic adaptation and why this macro increase is appropriate.

Respond with JSON:
{
  "calories": ${newCalories},
  "protein": ${newProtein},
  "carbs": ${newCarbs}, 
  "fat": ${newFat},
  "reasoning": "explanation from Coach Chassidy's perspective using 'I' statements about metabolic adaptation and hunger signals",
  "requiresTrainerApproval": true
}`
          },
          {
            role: "user", 
            content: `Client ${userProfile.firstName} has uploaded their nutrition with hunger level ${hungerLevel}. Please provide reasoning for the macro adjustment.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        calories: newCalories,
        protein: newProtein,
        carbs: newCarbs,
        fat: newFat,
        reasoning: result.reasoning || `Based on your hunger level of ${hungerLevel}/5, I'm recommending a 50-calorie increase to support your metabolic needs. This increase is distributed proportionally across your current macro ratios to maintain nutritional balance while addressing your body's signals for more fuel.`,
        requiresTrainerApproval: true,
        weightTrend: 0,
        adherenceScore: 0,
        programDay: 0
      };
    } catch (error) {
      console.error("Hunger-based macro adjustment error:", error);
      
      // Fallback calculation without AI
      const currentCalories = currentMacros.targetCalories || currentMacros.extractedCalories || 2000;
      const currentProtein = currentMacros.targetProtein || currentMacros.extractedProtein || 150;
      const currentCarbs = currentMacros.targetCarbs || currentMacros.extractedCarbs || 200;
      const currentFat = currentMacros.targetFat || currentMacros.extractedFat || 67;
      
      const totalCurrentCalories = (currentProtein * 4) + (currentCarbs * 4) + (currentFat * 9);
      const proteinPercentage = (currentProtein * 4) / totalCurrentCalories;
      const carbPercentage = (currentCarbs * 4) / totalCurrentCalories;
      const fatPercentage = (currentFat * 9) / totalCurrentCalories;
      
      const newCalories = currentCalories + 50;
      const additionalCalories = 50;
      
      const additionalProteinCalories = additionalCalories * proteinPercentage;
      const additionalCarbCalories = additionalCalories * carbPercentage;
      const additionalFatCalories = additionalCalories * fatPercentage;
      
      const newProtein = Math.round(currentProtein + (additionalProteinCalories / 4));
      const newCarbs = Math.round(currentCarbs + (additionalCarbCalories / 4));
      const newFat = Math.round(currentFat + (additionalFatCalories / 9));
      
      return {
        calories: newCalories,
        protein: newProtein,
        carbs: newCarbs,
        fat: newFat,
        reasoning: `Based on your hunger level of ${hungerLevel}/5, I'm recommending a 50-calorie increase to support your metabolic needs. Higher hunger levels often indicate your metabolism is adapting, and this small increase will help maintain your progress while keeping you satisfied.`,
        requiresTrainerApproval: true,
        weightTrend: 0,
        adherenceScore: 0,
        programDay: 0
      };
    }
  }
}

export const aiCoach = new AICoach();
