import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

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
    return `You are an expert AI fitness and nutrition coach. You provide personalized, safe, and evidence-based advice.

Guidelines:
- Always prioritize user safety and recommend consulting healthcare professionals for medical concerns
- Provide specific, actionable advice based on user's goals, current fitness level, and any injuries
- Use Chassidy's coaching tone: supportive, motivational, but realistic
- For low-confidence responses (< 0.7), flag for human review
- Include confidence score and reasoning in responses
- Never diagnose medical conditions or provide medical treatment advice

Response format should be encouraging but professional, focusing on sustainable habits and gradual progress.`;
  }

  async getChatResponse(
    userMessage: string, 
    userProfile: any, 
    conversationHistory: string[] = []
  ): Promise<CoachResponse> {
    try {
      const context = this.buildUserContext(userProfile);
      const history = conversationHistory.slice(-10).join('\n'); // Last 10 messages for context

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt() + `\n\nUser Context: ${context}`,
          },
          {
            role: "user",
            content: `Conversation history:\n${history}\n\nCurrent message: ${userMessage}\n\nPlease respond with JSON in this format: { "message": "your response", "confidence": 0.9, "requiresHumanReview": false, "suggestedActions": ["action1", "action2"] }`,
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
    // Basic BMR calculation using Mifflin-St Jeor equation
    const { weight = 70, height = 170, age = 30, gender = 'male', goal = 'maintenance', activityLevel = 'moderate' } = userProfile;
    
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
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
    
    // Macro distribution
    const protein = weight * 2.2; // 2.2g per kg bodyweight
    const fat = calories * 0.25 / 9; // 25% of calories from fat
    const carbs = (calories - (protein * 4) - (fat * 9)) / 4; // Remaining calories from carbs
    
    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      reasoning: "Calculated using standard formulas",
      adjustments: []
    };
  }
}

export const aiCoach = new AICoach();
