import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiCoach, extractNutritionFromScreenshot } from "./openai";
import { seedTestData, clearTestData } from "./testData";
import { 
  updateUserProfileSchema, 
  insertMealSchema, 
  insertWorkoutLogSchema,
  insertChatMessageSchema,
  insertExerciseSchema,
  insertProgressEntrySchema,
  users,
  macroChanges,
  chatMessages,
  dailyMacros
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, not } from "drizzle-orm";
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

// Configure multer for nutrition screenshot uploads
const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'public', 'screenshots');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const userId = 'user';
    const extension = path.extname(file.originalname);
    cb(null, `${userId}-${timestamp}${extension}`);
  }
});

const screenshotUpload = multer({
  storage: screenshotStorage,
  fileFilter: (req, file, cb) => {
    // Accept image files for nutrition screenshots
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for screenshots'));
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

  // Start user program - sets program start date to current timestamp
  app.post('/api/program/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Update user's program start date to current timestamp
      await db.update(users)
        .set({ 
          programStartDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      // Fetch updated user data
      const updatedUser = await storage.getUser(userId);
      
      res.json({ 
        message: "Program started successfully", 
        user: updatedUser,
        programStartDate: updatedUser?.programStartDate
      });
    } catch (error) {
      console.error("Error starting program:", error);
      res.status(500).json({ message: "Failed to start program" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('connect.sid');
      res.clearCookie('auth_token');
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Get available users for account switching
  app.get('/api/auth/available-users', async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching available users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user account
  app.post('/api/auth/create-user', async (req, res) => {
    try {
      const { firstName, lastName, email, goal, isTrainer, trainerInfo } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }
      
      // Generate unique user ID
      const userId = Math.random().toString(36).substring(2, 15);
      
      const userData = {
        id: userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        goal: goal?.trim() || null,
        trainerId: isTrainer ? null : 'coach_chassidy',
        onboardingCompleted: isTrainer ? true : false, // Trainers don't need onboarding
        programStartDate: isTrainer ? new Date() : null,
      };
      
      const newUser = await storage.upsertUser(userData);
      
      // If creating a trainer, also create trainer record with provided info
      if (isTrainer && trainerInfo) {
        await storage.upsertTrainer({
          id: userId,
          name: `${firstName} ${lastName}`,
          bio: trainerInfo.bio || `${firstName} ${lastName} - Personal Trainer`,
          specialties: trainerInfo.specialties || ["Weight Loss", "Strength Training", "Nutrition Coaching"],
          certifications: trainerInfo.certifications || [],
          yearsExperience: trainerInfo.yearsExperience || 1,
          clientsHelped: trainerInfo.clientsHelped || 0,
          photoUrl: trainerInfo.photoUrl || null,
          rating: 5.0,
        });
      }
      
      res.json({
        success: true,
        message: "User created successfully",
        user: newUser
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Dynamic account switching by user ID
  app.get('/api/auth/switch/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const authToken = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
      console.log(`Redirecting with ${userId} token:`, authToken);
      res.redirect(`/?auth=${authToken}`);
    } catch (error) {
      console.error("Error switching to user:", error);
      res.status(500).json({ message: "Failed to switch user" });
    }
  });



  // User profile routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = updateUserProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      
      // If this is onboarding completion, generate initial macro targets
      let macroData = null;
      if (profileData.onboardingCompleted) {
        const macroRecommendation = await aiCoach.calculateMacroTargets(updatedUser);
        
        // Get baseline macros from recent daily_macros entries (from screenshot upload)
        const recentMacros = await storage.getRecentMacros(userId, 7);
        const baselineMacros = recentMacros.length > 0 ? {
          calories: recentMacros[0].extractedCalories || 2000,
          protein: recentMacros[0].extractedProtein || 120,
          carbs: recentMacros[0].extractedCarbs || 200,
          fat: recentMacros[0].extractedFat || 65
        } : {
          calories: 2000,
          protein: 120,
          carbs: 200,
          fat: 65
        };

        // Apply Chassidy's gradual approach - max 50 calorie reduction
        const adjustedCalories = Math.max(baselineMacros.calories - 50, 1200);
        
        await storage.setMacroTargets({
          userId,
          date: new Date().toISOString().split('T')[0],
          calories: adjustedCalories,
          protein: macroRecommendation.protein,
          carbs: macroRecommendation.carbs,
          fat: macroRecommendation.fat,
        });

        macroData = {
          baselineCalories: baselineMacros.calories,
          newCalories: adjustedCalories,
          baselineMacros: {
            protein: baselineMacros.protein,
            carbs: baselineMacros.carbs,
            fat: baselineMacros.fat
          },
          newMacros: {
            protein: macroRecommendation.protein,
            carbs: macroRecommendation.carbs,
            fat: macroRecommendation.fat
          }
        };
      }
      
      res.json({ ...updatedUser, ...macroData });
    } catch (error) {
      console.error("Error updating user profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Profile image update route
  app.post('/api/profile/update', isAuthenticated, screenshotUpload.single('profileImage'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, bio } = req.body;
      const file = req.file;
      
      const updateData: any = {
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
      };

      // Add bio for trainers
      if (userId === 'coach_chassidy' && bio !== undefined) {
        updateData.bio = bio.trim();
      }

      // Handle profile image upload
      if (file) {
        updateData.profileImageUrl = `profiles/${file.filename}`;
      }

      const updatedUser = await storage.updateUserProfile(userId, updateData);
      
      res.json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update profile" 
      });
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

  app.get('/api/workout-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { exercise, days } = req.query;
      
      // Get logs from last 30 days by default
      const daysBack = parseInt(days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      const logs = await storage.getUserWorkoutLogs(userId, startDate);
      
      // Filter by exercise if specified
      const filteredLogs = exercise 
        ? logs.filter((log: any) => log.exerciseName.toLowerCase().includes(exercise.toLowerCase()))
        : logs;
      
      res.json(filteredLogs);
    } catch (error) {
      console.error("Error fetching workout logs:", error);
      res.status(500).json({ message: "Failed to fetch workout logs" });
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

  // Nutrition screenshot upload
  app.post('/api/nutrition/screenshot', isAuthenticated, screenshotUpload.single('screenshot'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      const { hungerLevel, energyLevel, notes, date } = req.body;
      
      if (!file) {
        return res.status(400).json({ message: "Screenshot file is required" });
      }
      
      // Read the saved file and convert to base64 for OpenAI
      const imagePath = file.path;
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');
      
      // Import and use OpenAI nutrition extraction
      const openaiModule = await import('./openai');
      const extraction = await openaiModule.extractNutritionFromScreenshot(imageBase64);
      
      if (extraction.error) {
        return res.status(400).json({ 
          success: false,
          message: extraction.error,
          extraction 
        });
      }
      
      // Save to database - check if record exists and update or create
      const targetDate = date || new Date().toISOString().split('T')[0];
      let dailyMacros;
      
      try {
        const existing = await storage.getDailyMacros(userId, new Date(targetDate));
        if (existing) {
          // Update existing record
          dailyMacros = await storage.updateDailyMacros(existing.id, {
            screenshotUrl: `screenshots/${file.filename}`,
            extractedCalories: extraction.calories,
            extractedProtein: extraction.protein,
            extractedCarbs: extraction.carbs,
            extractedFat: extraction.fat,
            visionConfidence: extraction.confidence,
            visionProcessedAt: new Date(),
            hungerLevel: hungerLevel ? parseInt(hungerLevel) : undefined,
            energyLevel: energyLevel ? parseInt(energyLevel) : undefined,
            notes: notes || undefined,
          });
        } else {
          // Create new record
          dailyMacros = await storage.createDailyMacros({
            userId,
            date: targetDate,
            screenshotUrl: `screenshots/${file.filename}`,
            extractedCalories: extraction.calories,
            extractedProtein: extraction.protein,
            extractedCarbs: extraction.carbs,
            extractedFat: extraction.fat,
            visionConfidence: extraction.confidence,
            visionProcessedAt: new Date(),
            hungerLevel: hungerLevel ? parseInt(hungerLevel) : undefined,
            energyLevel: energyLevel ? parseInt(energyLevel) : undefined,
            notes: notes || undefined,
          });
        }
      } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ 
          success: false,
          message: "Failed to save nutrition data",
          extraction: { calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0, error: "Database error" }
        });
      }
      
      res.json({
        success: true,
        message: "Screenshot processed successfully",
        extraction,
        dailyMacros
      });
    } catch (error) {
      console.error("Error processing screenshot:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process screenshot",
        extraction: { calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0, error: "Processing failed" }
      });
    }
  });

  // Get daily macros by date
  app.get('/api/daily-macros', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const date = req.query.date || new Date().toISOString().split('T')[0];
      
      const dailyMacros = await storage.getDailyMacros(userId, new Date(date));
      
      if (!dailyMacros) {
        return res.status(404).json({ message: "No data found for this date" });
      }
      
      res.json(dailyMacros);
    } catch (error) {
      console.error("Error fetching daily macros:", error);
      res.status(500).json({ message: "Failed to fetch daily macros" });
    }
  });

  // Get recent daily macros for progress tracking
  app.get('/api/daily-macros/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.query.days as string) || 7;
      
      const recentMacros = await storage.getRecentMacros(userId, days);
      res.json(recentMacros);
    } catch (error) {
      console.error("Error fetching recent macros:", error);
      res.status(500).json({ message: "Failed to fetch recent macros" });
    }
  });

  // Get monthly macros for calendar view
  app.get('/api/daily-macros/month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      
      // Get first and last day of the month
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      const macros = await db.select()
        .from(dailyMacros)
        .where(
          and(
            eq(dailyMacros.userId, userId),
            gte(dailyMacros.date, firstDay.toISOString().split('T')[0]),
            lte(dailyMacros.date, lastDay.toISOString().split('T')[0])
          )
        )
        .orderBy(desc(dailyMacros.date));
      
      res.json(macros);
    } catch (error) {
      console.error("Error fetching monthly macros:", error);
      res.status(500).json({ message: "Failed to fetch monthly macros" });
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

  app.post('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressData = insertProgressEntrySchema.parse({
        ...req.body,
        userId,
      });
      
      const progressEntry = await storage.createProgressEntry(progressData);
      res.json(progressEntry);
    } catch (error) {
      console.error("Error creating progress entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create progress entry" });
    }
  });

  // Exercise management routes
  app.get('/api/exercises', async (req, res) => {
    try {
      const exercises = await storage.getExercises();
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.get('/api/exercises/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const exercise = await storage.getExerciseById(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      res.json(exercise);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      res.status(500).json({ message: "Failed to fetch exercise" });
    }
  });

  app.post('/api/exercises', upload.single('gif'), async (req, res) => {
    try {
      const exerciseData = {
        ...req.body,
        primaryMuscles: Array.isArray(req.body.primaryMuscles) 
          ? req.body.primaryMuscles 
          : JSON.parse(req.body.primaryMuscles || '[]'),
        secondaryMuscles: Array.isArray(req.body.secondaryMuscles)
          ? req.body.secondaryMuscles
          : JSON.parse(req.body.secondaryMuscles || '[]'),
        videoUrl: req.file ? `/exercises/${req.file.filename}` : undefined
      };

      const validatedData = insertExerciseSchema.parse(exerciseData);
      const exercise = await storage.createExercise(validatedData);
      res.status(201).json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.issues 
        });
      }
      res.status(500).json({ message: "Failed to create exercise" });
    }
  });

  // Upload route for admin interface
  app.post('/api/exercises/upload', upload.array('videos', 500), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const exercises = [];
      const errors = [];
      
      for (const file of files) {
        try {
          // Extract exercise name from filename or use provided name
          let exerciseName = req.body.exerciseName || 
            path.basename(file.filename, path.extname(file.filename))
              .replace(/-/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
          
          const primaryMuscles = req.body.primaryMuscles ? 
            req.body.primaryMuscles.split(',').map(m => m.trim()) : 
            ['General'];
          
          const exerciseData = {
            name: exerciseName,
            videoUrl: `/exercises/${file.filename}`,
            primaryMuscles,
            secondaryMuscles: [],
            category: 'Uploaded',
            difficulty: req.body.difficulty || 'Intermediate'
          };

          const validatedData = insertExerciseSchema.parse(exerciseData);
          const exercise = await storage.createExercise(validatedData);
          exercises.push(exercise);
        } catch (error) {
          errors.push({ filename: file.filename, error: (error as Error).message });
        }
      }

      res.json({ 
        message: `Successfully uploaded ${exercises.length} exercises`,
        total: files.length,
        successful: exercises.length,
        errors: errors.length,
        exercises: exercises.slice(0, 10),
        errorDetails: errors.slice(0, 5)
      });
    } catch (error) {
      console.error("Error in upload:", error);
      res.status(500).json({ message: "Failed to process upload" });
    }
  });

  app.post('/api/exercises/bulk-upload', upload.array('gifs', 500), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const exercises = [];
      const errors = [];
      
      for (const file of files) {
        try {
          // Extract exercise name from filename
          const exerciseName = path.basename(file.filename, path.extname(file.filename))
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          const exerciseData = {
            name: exerciseName,
            videoUrl: `/exercises/${file.filename}`,
            primaryMuscles: ['General'],
            secondaryMuscles: [],
            category: 'Uploaded',
            difficulty: 'Intermediate'
          };

          const validatedData = insertExerciseSchema.parse(exerciseData);
          const exercise = await storage.createExercise(validatedData);
          exercises.push(exercise);
        } catch (error) {
          errors.push({ filename: file.filename, error: error.message });
        }
      }

      res.json({ 
        message: `Successfully uploaded ${exercises.length} exercises`,
        total: files.length,
        successful: exercises.length,
        errors: errors.length,
        exercises: exercises.slice(0, 10),
        errorDetails: errors.slice(0, 5)
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({ message: "Failed to process bulk upload" });
    }
  });

  // Test route
  app.get('/admin/test', (req, res) => {
    res.send('<h1>Admin Test Page Works!</h1><p>If you see this, the server is working.</p>');
  });

  // Simple admin interface for development
  app.get('/admin/exercises', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Exercise Upload Admin</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .upload-area { border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; }
        .upload-area:hover { border-color: #999; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #0056b3; }
        .results { margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 4px; }
        .error { color: #dc3545; }
        .success { color: #28a745; }
    </style>
</head>
<body>
    <h1>Exercise GIF Upload</h1>
    <div class="upload-area" onclick="document.getElementById('fileInput').click()">
        <p>Click here to select exercise GIF files</p>
        <p>Supports single or multiple file upload</p>
    </div>
    
    <form id="uploadForm" enctype="multipart/form-data">
        <input type="file" id="fileInput" name="videos" multiple accept=".gif" style="display: none;">
        <br><br>
        <label>Exercise Name (optional - will auto-extract from filename):</label><br>
        <input type="text" id="exerciseName" placeholder="e.g., Push Up"><br><br>
        
        <label>Primary Muscles:</label><br>
        <input type="text" id="primaryMuscles" placeholder="e.g., Chest, Shoulders" value="General"><br><br>
        
        <label>Difficulty:</label><br>
        <select id="difficulty">
            <option value="Beginner">Beginner</option>
            <option value="Intermediate" selected>Intermediate</option>
            <option value="Advanced">Advanced</option>
        </select><br><br>
        
        <button type="submit" class="btn">Upload Exercise(s)</button>
    </form>
    
    <div id="results" class="results" style="display: none;"></div>

    <script>
        document.getElementById('fileInput').addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                document.querySelector('.upload-area p').textContent = 
                    files.length === 1 ? files[0].name : files.length + ' files selected';
            }
        });

        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const files = document.getElementById('fileInput').files;
            if (files.length === 0) {
                alert('Please select at least one GIF file');
                return;
            }
            
            const formData = new FormData();
            for (let file of files) {
                formData.append('videos', file);
            }
            
            const exerciseName = document.getElementById('exerciseName').value;
            const primaryMuscles = document.getElementById('primaryMuscles').value;
            const difficulty = document.getElementById('difficulty').value;
            
            if (exerciseName) formData.append('exerciseName', exerciseName);
            if (primaryMuscles) formData.append('primaryMuscles', primaryMuscles);
            if (difficulty) formData.append('difficulty', difficulty);
            
            const resultsDiv = document.getElementById('results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = '<p>Uploading...</p>';
            
            try {
                const response = await fetch('/api/exercises/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    resultsDiv.innerHTML = \`
                        <div class="success">
                            <h3>Upload Successful!</h3>
                            <p>Total files: \${result.total}</p>
                            <p>Successful: \${result.successful}</p>
                            <p>Errors: \${result.errors}</p>
                            \${result.exercises.length > 0 ? '<h4>Uploaded Exercises:</h4><ul>' + 
                              result.exercises.map(ex => '<li>' + ex.name + ' (ID: ' + ex.id + ')</li>').join('') + 
                              '</ul>' : ''}
                        </div>
                    \`;
                } else {
                    resultsDiv.innerHTML = '<div class="error">Upload failed: ' + result.message + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="error">Upload failed: ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>
    `);
  });

  // Testing endpoints for simulating multiple days of usage
  app.post('/api/test/seed-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { days = 14 } = req.body;
      
      const result = await seedTestData(userId, days);
      res.json(result);
    } catch (error) {
      console.error("Error seeding test data:", error);
      res.status(500).json({ message: "Failed to seed test data" });
    }
  });

  app.post('/api/test/clear-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const result = await clearTestData(userId);
      res.json(result);
    } catch (error) {
      console.error("Error clearing test data:", error);
      res.status(500).json({ message: "Failed to clear test data" });
    }
  });

  // Trainer dashboard routes
  app.get('/api/trainer/profile', isAuthenticated, async (req: any, res) => {
    try {
      const trainerId = req.user.claims.sub;
      
      if (trainerId !== 'coach_chassidy') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const trainer = await storage.getTrainer(trainerId);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer profile not found" });
      }
      
      res.json(trainer);
    } catch (error) {
      console.error("Error fetching trainer profile:", error);
      res.status(500).json({ message: "Failed to fetch trainer profile" });
    }
  });

  app.post('/api/trainer/update-profile', isAuthenticated, upload.single('profileImage'), async (req: any, res) => {
    try {
      const trainerId = req.user.claims.sub;
      
      if (trainerId !== 'coach_chassidy') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { 
        firstName, 
        lastName, 
        bio, 
        specialties, 
        certifications,
        yearsExperience,
        clientsHelped,
        rating
      } = req.body;
      
      // Update user record for basic info using direct DB update
      const userUpdates: any = {};
      if (firstName) userUpdates.firstName = firstName;
      if (lastName) userUpdates.lastName = lastName;
      
      if (req.file) {
        const photoUrl = `/uploads/${req.file.filename}`;
        userUpdates.profileImageUrl = photoUrl;
      }
      
      if (Object.keys(userUpdates).length > 0) {
        await db.update(users)
          .set({ ...userUpdates, updatedAt: new Date() })
          .where(eq(users.id, trainerId));
      }

      // Update trainer record for bio and other trainer-specific data
      const trainerUpdates: any = {};
      if (bio !== undefined) trainerUpdates.bio = bio;
      if (specialties !== undefined) {
        trainerUpdates.specialties = JSON.parse(specialties);
      }
      if (certifications !== undefined) {
        trainerUpdates.certifications = JSON.parse(certifications);
      }
      if (yearsExperience !== undefined) {
        trainerUpdates.yearsExperience = parseInt(yearsExperience);
      }
      if (clientsHelped !== undefined) {
        trainerUpdates.clientsHelped = parseInt(clientsHelped);
      }
      if (rating !== undefined) {
        trainerUpdates.rating = parseFloat(rating);
      }
      
      if (req.file) {
        const photoUrl = `/uploads/${req.file.filename}`;
        trainerUpdates.photoUrl = photoUrl;
      }

      // Update trainer data if there are trainer-specific updates
      if (Object.keys(trainerUpdates).length > 0) {
        await storage.upsertTrainer({
          id: trainerId,
          name: `${firstName} ${lastName}`,
          ...trainerUpdates,
        });
      }

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating trainer profile:", error);
      res.status(500).json({ message: "Failed to update trainer profile" });
    }
  });

  // Public endpoint for trainer info (used by Meet Your Coach page)
  app.get('/api/trainer/coach_chassidy', async (req, res) => {
    try {
      const trainer = await storage.getTrainer('coach_chassidy');
      
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }
      
      res.json(trainer);
    } catch (error) {
      console.error("Error fetching trainer:", error);
      res.status(500).json({ message: "Failed to fetch trainer" });
    }
  });

  app.get('/api/trainer/clients', isAuthenticated, async (req: any, res) => {
    try {
      const trainerId = req.user.claims.sub;
      
      // For Coach Chassidy, show all clients assigned to her (excluding the trainer themselves)
      const clients = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
        goal: users.goal,
        weight: users.weight,
        goalWeight: users.goalWeight,
        programStartDate: users.programStartDate,
        onboardingCompleted: users.onboardingCompleted,
      }).from(users).where(
        and(
          eq(users.trainerId, 'coach_chassidy'),
          not(eq(users.id, 'coach_chassidy'))
        )
      );
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching trainer clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/trainer/pending-macro-changes', isAuthenticated, async (req: any, res) => {
    try {
      const pendingChanges = await db
        .select({
          id: macroChanges.id,
          userId: macroChanges.userId,
          proposedCalories: macroChanges.aiCalories,
          proposedProtein: macroChanges.aiProtein,
          proposedCarbs: macroChanges.aiCarbs,
          proposedFat: macroChanges.aiFat,
          reasoning: macroChanges.aiReasoning,
          requestDate: macroChanges.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
            goal: users.goal,
          }
        })
        .from(macroChanges)
        .innerJoin(users, eq(macroChanges.userId, users.id))
        .where(eq(macroChanges.status, 'pending'));
      
      res.json(pendingChanges);
    } catch (error) {
      console.error("Error fetching pending macro changes:", error);
      res.status(500).json({ message: "Failed to fetch pending macro changes" });
    }
  });

  app.post('/api/trainer/approve-macro-change/:changeId', isAuthenticated, async (req: any, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const changeId = parseInt(req.params.changeId);
      const { trainerNotes } = req.body;
      
      const approvedChange = await storage.approveMacroChange(changeId, trainerId, trainerNotes);
      res.json(approvedChange);
    } catch (error) {
      console.error("Error approving macro change:", error);
      res.status(500).json({ message: "Failed to approve macro change" });
    }
  });

  app.post('/api/trainer/edit-macro-change/:changeId', isAuthenticated, async (req: any, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const changeId = parseInt(req.params.changeId);
      const { finalMacros, trainerNotes } = req.body;
      
      const editedChange = await storage.editMacroChange(changeId, trainerId, finalMacros, trainerNotes);
      res.json(editedChange);
    } catch (error) {
      console.error("Error editing macro change:", error);
      res.status(500).json({ message: "Failed to edit macro change" });
    }
  });

  app.get('/api/trainer/recent-chats', isAuthenticated, async (req: any, res) => {
    try {
      const { limit = 50 } = req.query;
      
      const recentChats = await db
        .select({
          id: chatMessages.id,
          userId: chatMessages.userId,
          message: chatMessages.message,
          isAI: chatMessages.isAI,
          createdAt: chatMessages.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
          }
        })
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.userId, users.id))
        .where(eq(users.trainerId, 'coach_chassidy'))
        .orderBy(desc(chatMessages.createdAt))
        .limit(parseInt(limit as string));
      
      res.json(recentChats);
    } catch (error) {
      console.error("Error fetching recent chats:", error);
      res.status(500).json({ message: "Failed to fetch recent chats" });
    }
  });

  app.get('/api/trainer/client-progress/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.params.clientId;
      
      // Get client progress entries
      const progressEntries = await storage.getUserProgressEntries(clientId);
      
      // Get recent macro data
      const recentMacros = await storage.getRecentMacros(clientId, 30);
      
      // Get workout logs
      const workoutLogs = await storage.getUserWorkoutLogs(clientId);
      
      res.json({
        progressEntries,
        recentMacros,
        workoutLogs
      });
    } catch (error) {
      console.error("Error fetching client progress:", error);
      res.status(500).json({ message: "Failed to fetch client progress" });
    }
  });

  app.get('/api/trainer/client/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Get individual client data for trainer
  app.get('/api/trainer/client/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.get('/api/trainer/client/:clientId/daily-macros/month', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: "Year and month are required" });
      }
      
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
      
      const macros = await storage.getClientMacrosForMonth(clientId, startDate, endDate);
      res.json(macros);
    } catch (error) {
      console.error("Error fetching client monthly macros:", error);
      res.status(500).json({ message: "Failed to fetch client macros" });
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
