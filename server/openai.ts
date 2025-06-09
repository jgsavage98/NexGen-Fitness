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
      
      return {
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
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
      return {
        calories: Math.round(bmr * 1.2), // Conservative sedentary multiplier
        protein: Math.round(userProfile.currentWeight * 2.2 * 0.8), // 0.8g per lb
        carbs: Math.round(bmr * 1.2 * 0.4 / 4), // 40% of calories
        fat: Math.round(bmr * 1.2 * 0.3 / 9), // 30% of calories
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
    conversationHistory: string[] = [],
    isPendingApproval: boolean = false
  ): Promise<CoachResponse> {
    try {
      const context = this.buildUserContext(userProfile, isPendingApproval);
      const history = conversationHistory.slice(-10).join('\n'); // Last 10 messages for context

      const approvalContext = isPendingApproval 
        ? "\n\nIMPORTANT: This client is currently awaiting trainer approval for their personalized macro plan. You are currently reviewing their onboarding information and MyFitnessPal baseline data to create their customized nutrition targets. Let them know you're working on their plan and will have it ready soon. Be encouraging about the process and remind them that this personalized approach ensures the best results."
        : "";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt() + `\n\nUser Context: ${context}${approvalContext}`,
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

  private buildUserContext(userProfile: any, includePersonalData: boolean = false): string {
    if (!userProfile) return "No user profile available";

    if (!includePersonalData) {
      // Privacy-focused version - only fitness-relevant data
      return `
User Profile:
- Goal: ${userProfile.goal || 'general fitness'}
- Activity Level: ${userProfile.activityLevel || 'moderate'}
- Movement Restrictions: ${userProfile.injuries?.length ? 'has limitations' : 'none reported'}
- Available Equipment: ${userProfile.equipment?.join(', ') || 'bodyweight only'}
      `.trim();
    }

    // Full version (only if explicitly requested)
    return `
User Profile:
- Goal: ${userProfile.goal || 'not specified'}
- Age: ${userProfile.age || 'not specified'}
- Gender: ${userProfile.gender || 'not specified'}
- Height: ${userProfile.height || 'not specified'} cm
- Weight: ${userProfile.weight || 'not specified'} kg
- Activity Level: ${userProfile.activityLevel || 'not specified'}
- Injuries: ${userProfile.injuries?.join(', ') || 'none reported'}
- Available Equipment: ${userProfile.equipment?.join(', ') || 'not specified'}
    `.trim();
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
}

export const aiCoach = new AICoach();
