import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiCoach } from "./openai";
import { 
  updateUserProfileSchema, 
  insertMealSchema, 
  insertWorkoutLogSchema,
  insertChatMessageSchema,
  insertExerciseSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for exercise GIF uploads
const exerciseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'public', 'exercises');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Use original filename or create standardized name
    const exerciseName = req.body.name || 'exercise';
    const sanitized = exerciseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const extension = path.extname(file.originalname);
    cb(null, `${sanitized}${extension}`);
  }
});

const upload = multer({ 
  storage: exerciseStorage,
  fileFilter: (req, file, cb) => {
    // Accept only GIF and video files
    if (file.mimetype.startsWith('image/gif') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only GIF and video files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = updateUserProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      
      // If this is onboarding completion, generate initial macro targets
      if (profileData.onboardingCompleted) {
        const macroRecommendation = await aiCoach.calculateMacroTargets(updatedUser);
        await storage.setMacroTargets({
          userId,
          date: new Date().toISOString().split('T')[0],
          calories: macroRecommendation.calories,
          protein: macroRecommendation.protein,
          carbs: macroRecommendation.carbs,
          fat: macroRecommendation.fat,
        });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Exercise routes
  app.get('/api/exercises', isAuthenticated, async (req, res) => {
    try {
      const { category } = req.query;
      let exercises;
      
      if (category && typeof category === 'string') {
        exercises = await storage.getExercisesByCategory(category);
      } else {
        exercises = await storage.getExercises();
      }
      
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.get('/api/exercises/:id', isAuthenticated, async (req, res) => {
    try {
      const exerciseId = parseInt(req.params.id);
      const exercise = await storage.getExerciseById(exerciseId);
      
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      res.json(exercise);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      res.status(500).json({ message: "Failed to fetch exercise" });
    }
  });

  // Workout routes
  app.get('/api/workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workouts = await storage.getUserWorkouts(userId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  app.get('/api/workout/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has a workout for today
      let workout = await storage.getTodaysWorkout(userId);
      
      // If no workout exists, generate one using AI
      if (!workout && user) {
        const workoutRecommendation = await aiCoach.generateWorkoutRecommendation(user);
        
        // Convert AI recommendation to workout format
        const exerciseData = workoutRecommendation.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest,
          targetMuscles: ex.targetMuscles,
          difficulty: ex.difficulty
        }));
        
        workout = await storage.createWorkout({
          userId,
          name: workoutRecommendation.focus,
          type: 'strength',
          targetMuscleGroups: workoutRecommendation.exercises.flatMap(ex => ex.targetMuscles),
          estimatedDuration: workoutRecommendation.estimatedDuration,
          difficulty: 'intermediate',
          exercises: exerciseData,
        });
      }
      
      res.json(workout);
    } catch (error) {
      console.error("Error fetching today's workout:", error);
      res.status(500).json({ message: "Failed to fetch today's workout" });
    }
  });

  app.post('/api/workout/log-exercise', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logData = insertWorkoutLogSchema.parse({
        ...req.body,
        userId,
      });
      
      const log = await storage.logWorkoutExercise(logData);
      res.json(log);
    } catch (error) {
      console.error("Error logging exercise:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid log data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to log exercise" });
    }
  });

  // Meal and nutrition routes
  app.get('/api/meals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.query;
      
      const targetDate = date ? new Date(date as string) : new Date();
      const meals = await storage.getUserMeals(userId, targetDate);
      
      res.json(meals);
    } catch (error) {
      console.error("Error fetching meals:", error);
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  app.post('/api/meals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealData = insertMealSchema.parse({
        ...req.body,
        userId,
      });
      
      const meal = await storage.logMeal(mealData);
      res.json(meal);
    } catch (error) {
      console.error("Error logging meal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid meal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to log meal" });
    }
  });

  app.get('/api/macro-targets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.query;
      
      const targetDate = date ? new Date(date as string) : new Date();
      const targets = await storage.getUserMacroTargets(userId, targetDate);
      
      if (!targets) {
        // Generate targets if they don't exist
        const user = await storage.getUser(userId);
        if (user) {
          const macroRecommendation = await aiCoach.calculateMacroTargets(user);
          const newTargets = await storage.setMacroTargets({
            userId,
            date: targetDate.toISOString().split('T')[0],
            calories: macroRecommendation.calories,
            protein: macroRecommendation.protein,
            carbs: macroRecommendation.carbs,
            fat: macroRecommendation.fat,
          });
          return res.json(newTargets);
        }
      }
      
      res.json(targets);
    } catch (error) {
      console.error("Error fetching macro targets:", error);
      res.status(500).json({ message: "Failed to fetch macro targets" });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit } = req.query;
      
      const messages = await storage.getUserChatMessages(userId, limit ? parseInt(limit as string) : 50);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/chat/message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, isVoice } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      // Save user message
      await storage.saveChatMessage({
        userId,
        message,
        isAI: false,
        metadata: isVoice ? { isVoice: true } : null,
      });
      
      // Get user profile for context
      const user = await storage.getUser(userId);
      
      // Get recent conversation history
      const recentMessages = await storage.getUserChatMessages(userId, 10);
      const conversationHistory = recentMessages.map(msg => 
        `${msg.isAI ? 'Coach' : 'User'}: ${msg.message}`
      );
      
      // Get AI response
      const aiResponse = await aiCoach.getChatResponse(message, user, conversationHistory);
      
      // Save AI response
      const savedAIMessage = await storage.saveChatMessage({
        userId,
        message: aiResponse.message,
        isAI: true,
        metadata: {
          confidence: aiResponse.confidence,
          requiresHumanReview: aiResponse.requiresHumanReview,
          suggestedActions: aiResponse.suggestedActions,
        },
      });
      
      res.json({
        userMessage: { userId, message, isAI: false },
        aiMessage: savedAIMessage,
        aiResponse
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.post('/api/chat/voice', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.body || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ message: "Audio data is required" });
      }
      
      // Transcribe audio
      const transcription = await aiCoach.transcribeAudio(req.body);
      
      if (!transcription.text) {
        return res.status(400).json({ message: "Could not transcribe audio" });
      }
      
      // Process as regular chat message
      const { text: message } = transcription;
      
      // Save user message
      await storage.saveChatMessage({
        userId,
        message,
        isAI: false,
        metadata: { isVoice: true, duration: transcription.duration },
      });
      
      // Get AI response (same as text chat)
      const user = await storage.getUser(userId);
      const recentMessages = await storage.getUserChatMessages(userId, 10);
      const conversationHistory = recentMessages.map(msg => 
        `${msg.isAI ? 'Coach' : 'User'}: ${msg.message}`
      );
      
      const aiResponse = await aiCoach.getChatResponse(message, user, conversationHistory);
      
      const savedAIMessage = await storage.saveChatMessage({
        userId,
        message: aiResponse.message,
        isAI: true,
        metadata: {
          confidence: aiResponse.confidence,
          requiresHumanReview: aiResponse.requiresHumanReview,
          suggestedActions: aiResponse.suggestedActions,
        },
      });
      
      res.json({
        transcription,
        userMessage: { userId, message, isAI: false },
        aiMessage: savedAIMessage,
        aiResponse
      });
    } catch (error) {
      console.error("Error processing voice message:", error);
      res.status(500).json({ message: "Failed to process voice message" });
    }
  });

  // Progress routes
  app.get('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressEntries = await storage.getUserProgressEntries(userId);
      res.json(progressEntries);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat') {
          // Handle real-time chat messages
          const { userId, content } = message;
          
          // Broadcast to all connected clients for this user
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'chat',
                userId,
                content,
                timestamp: new Date().toISOString(),
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
