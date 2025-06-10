import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiCoach, extractNutritionFromScreenshot } from "./openai";
import { seedTestData, clearTestData } from "./testData";
import { getTodayInTimezone, getDateInTimezone, getMonthBoundsInTimezone } from "./timezone";
import { generateProgressReportPDF, savePDFToFile, type ProgressReportData } from "./pdfGenerator";
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
  dailyMacros,
  progressEntries
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
      const { firstName, lastName, email, isTrainer, trainerInfo } = req.body;
      
      // For trainers, require all basic information
      if (isTrainer && (!firstName || !lastName || !email)) {
        return res.status(400).json({ message: "First name, last name, and email are required for trainers" });
      }
      
      // Generate unique user ID
      const userId = Math.random().toString(36).substring(2, 15);
      
      // Smart trainer assignment logic
      let assignedTrainerId = null;
      if (!isTrainer) {
        // For clients, check how many trainers exist
        const allTrainers = await storage.getAllTrainers();
        if (allTrainers.length === 1 && allTrainers[0].id === 'coach_chassidy') {
          // Only Chassidy exists, auto-assign to her
          assignedTrainerId = 'coach_chassidy';
        } else if (allTrainers.length > 1) {
          // Multiple trainers exist, leave unassigned for manual assignment
          assignedTrainerId = null;
        } else {
          // Fallback to Chassidy if no trainers found
          assignedTrainerId = 'coach_chassidy';
        }
      }

      const userData = {
        id: userId,
        firstName: isTrainer ? firstName.trim() : null, // Clients provide this during onboarding
        lastName: isTrainer ? lastName.trim() : null,   // Clients provide this during onboarding
        email: isTrainer ? email.trim() : null,         // Clients provide this during onboarding
        goal: null, // Goals will be set during onboarding
        trainerId: assignedTrainerId,
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



  // Profile image upload
  app.post('/api/user/profile-image', isAuthenticated, screenshotUpload.single('profileImage'), async (req: any, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "Profile image file is required" });
      }
      
      const profileImageUrl = `screenshots/${file.filename}`;
      res.json({ profileImageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });

  // User profile routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = updateUserProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      
      // If this is onboarding completion, generate initial macro plan for trainer approval
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
        
        // Create pending macro change for trainer approval instead of setting active targets
        await storage.createMacroChange({
          userId,
          date: new Date().toISOString().split('T')[0],
          oldCalories: baselineMacros.calories,
          oldProtein: baselineMacros.protein,
          oldCarbs: baselineMacros.carbs,
          oldFat: baselineMacros.fat,
          aiProposal: {
            type: 'initial_plan',
            reasoning: macroRecommendation.reasoning,
            baseline: baselineMacros,
            adjustments: macroRecommendation.adjustments || []
          },
          aiCalories: adjustedCalories,
          aiProtein: macroRecommendation.protein,
          aiCarbs: macroRecommendation.carbs,
          aiFat: macroRecommendation.fat,
          aiReasoning: macroRecommendation.reasoning,
          status: 'pending',
          trainerId: null // Will be filled when trainer reviews
        });

        macroData = {
          status: 'pending_trainer_approval',
          baselineCalories: baselineMacros.calories,
          proposedCalories: adjustedCalories,
          baselineMacros: {
            protein: baselineMacros.protein,
            carbs: baselineMacros.carbs,
            fat: baselineMacros.fat
          },
          proposedMacros: {
            protein: macroRecommendation.protein,
            carbs: macroRecommendation.carbs,
            fat: macroRecommendation.fat
          },
          message: 'Your macro plan has been generated and is pending trainer approval.'
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

  // Nutrition extraction for onboarding (doesn't save to database)
  app.post('/api/nutrition/extract', isAuthenticated, screenshotUpload.single('screenshot'), async (req: any, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "Screenshot file is required" });
      }
      
      // Read the saved file and convert to base64 for OpenAI
      const imagePath = file.path;
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');
      
      // Import and use OpenAI nutrition extraction
      const openaiModule = await import('./openai');
      const extraction = await openaiModule.extractNutritionFromScreenshot(imageBase64);
      
      // Clean up temporary file
      fs.unlinkSync(imagePath);
      
      res.json(extraction);
    } catch (error) {
      console.error("Error extracting nutrition data:", error);
      res.status(500).json({ 
        calories: 0, 
        protein: 0, 
        carbs: 0, 
        fat: 0, 
        confidence: 0, 
        error: "Failed to extract nutrition data" 
      });
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
      let extraction;
      try {
        const openaiModule = await import('./openai');
        extraction = await openaiModule.extractNutritionFromScreenshot(imageBase64);
        
        if (extraction.error) {
          return res.status(400).json({ 
            success: false,
            message: extraction.error,
            extraction 
          });
        }
      } catch (error) {
        console.error("OpenAI extraction error:", error);
        return res.status(500).json({ 
          success: false,
          message: "Failed to extract nutrition data from screenshot",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Save to database - check if record exists and update or create
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      const targetDate = date || getTodayInTimezone(userTimezone);
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
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      
      const date = req.query.date || getTodayInTimezone(userTimezone);
      
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
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      
      // Get first and last day of the month in user's timezone
      const { firstDay, lastDay } = getMonthBoundsInTimezone(year, month, userTimezone);
      
      const macros = await db.select()
        .from(dailyMacros)
        .where(
          and(
            eq(dailyMacros.userId, userId),
            gte(dailyMacros.date, firstDay),
            lte(dailyMacros.date, lastDay)
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
      
      // Check if user has pending macro changes awaiting trainer approval
      const pendingChanges = await storage.getPendingMacroChanges();
      const userPendingChange = pendingChanges.find(change => change.userId === userId);
      
      if (userPendingChange) {
        // User has pending macro plan awaiting trainer approval
        return res.json({
          status: 'pending_trainer_approval',
          message: 'Your macro plan is being reviewed by your trainer and will be available soon.',
          pendingMacros: {
            calories: userPendingChange.aiCalories,
            protein: userPendingChange.aiProtein,
            carbs: userPendingChange.aiCarbs,
            fat: userPendingChange.aiFat
          },
          reasoning: userPendingChange.aiReasoning,
          submittedAt: userPendingChange.createdAt
        });
      }
      
      const targets = await storage.getUserMacroTargets(userId, targetDate);
      
      if (!targets) {
        // No targets exist and no pending approval - this shouldn't happen for completed onboarding
        const user = await storage.getUser(userId);
        if (user && !user.onboardingCompleted) {
          return res.json({
            status: 'onboarding_incomplete',
            message: 'Please complete your onboarding to receive your personalized macro plan.'
          });
        }
        
        // Fallback: Return message indicating they need trainer setup
        return res.json({
          status: 'no_targets',
          message: 'No macro targets available. Please contact your trainer.'
        });
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

  // Get unread messages count
  app.get('/api/chat/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadMessagesCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread messages count:", error);
      res.status(500).json({ message: "Failed to fetch unread messages count" });
    }
  });

  // Mark messages as read
  app.post('/api/chat/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageIds } = req.body;
      await storage.markMessagesAsRead(userId, messageIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Trainer chat routes
  app.get('/api/trainer/client-chat/:clientId', async (req: any, res) => {
    try {
      const trainerId = req.user?.claims?.sub;
      if (!trainerId || !trainerId.startsWith('coach_')) {
        return res.status(403).json({ message: "Unauthorized - Trainer access required" });
      }

      const { clientId } = req.params;
      const { limit } = req.query;
      
      const messages = await storage.getClientChatMessages(clientId, trainerId, limit ? parseInt(limit as string) : 50);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Error fetching client chat messages:", error);
      res.status(500).json({ message: "Failed to fetch client chat messages" });
    }
  });

  app.get('/api/trainer/pending-chat-approvals', isAuthenticated, async (req: any, res) => {
    try {
      const trainerId = req.user?.claims?.sub;
      if (!trainerId || !trainerId.startsWith('coach_')) {
        return res.status(403).json({ message: "Unauthorized - Trainer access required" });
      }

      const pendingMessages = await storage.getPendingChatApprovals(trainerId);
      res.json(pendingMessages);
    } catch (error) {
      console.error("Error fetching pending chat approvals:", error);
      res.status(500).json({ message: "Failed to fetch pending chat approvals" });
    }
  });

  app.post('/api/trainer/approve-chat/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const trainerId = req.user?.claims?.sub;
      if (!trainerId || !trainerId.startsWith('coach_')) {
        return res.status(403).json({ message: "Unauthorized - Trainer access required" });
      }

      const { messageId } = req.params;
      const { approvedMessage, trainerNotes } = req.body;
      
      const approvedMsg = await storage.approveChatMessage(
        parseInt(messageId), 
        trainerId, 
        approvedMessage, 
        trainerNotes
      );
      
      res.json(approvedMsg);
    } catch (error) {
      console.error("Error approving chat message:", error);
      res.status(500).json({ message: "Failed to approve chat message" });
    }
  });

  app.post('/api/trainer/reject-chat/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const trainerId = req.user?.claims?.sub;
      if (!trainerId || !trainerId.startsWith('coach_')) {
        return res.status(403).json({ message: "Unauthorized - Trainer access required" });
      }

      const { messageId } = req.params;
      const { trainerNotes } = req.body;
      
      const rejectedMsg = await storage.rejectChatMessage(
        parseInt(messageId), 
        trainerId, 
        trainerNotes
      );
      
      res.json(rejectedMsg);
    } catch (error) {
      console.error("Error rejecting chat message:", error);
      res.status(500).json({ message: "Failed to reject chat message" });
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
      
      // Check if client is awaiting trainer approval
      const today = new Date().toISOString().split('T')[0];
      let isPendingApproval = false;
      
      try {
        // Check for pending macro changes (trainer approval workflow)
        const pendingChanges = await storage.getPendingMacroChanges();
        const userPendingChange = pendingChanges.find(change => change.userId === userId);
        isPendingApproval = !!userPendingChange;
        
        // If no pending change, check if user has approved macro targets
        if (!isPendingApproval) {
          const macroTargets = await storage.getUserMacroTargets(userId, new Date(today));
          isPendingApproval = !macroTargets;
        }
      } catch (error) {
        console.log("Error checking approval status for chat:", error);
        isPendingApproval = false;
      }
      
      // Get recent conversation history
      const recentMessages = await storage.getUserChatMessages(userId, 10);
      const conversationHistory = recentMessages.map(msg => 
        `${msg.isAI ? 'Coach' : 'User'}: ${msg.message}`
      );
      
      // Get AI response with approval context
      const aiResponse = await aiCoach.getChatResponse(message, user, conversationHistory, isPendingApproval);
      
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
      
      // Add cache-busting timestamp to force frontend refresh
      const responseWithTimestamp = pendingChanges.map(change => ({
        ...change,
        lastUpdated: new Date().toISOString()
      }));
      
      // Set no-cache headers to prevent caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(responseWithTimestamp);
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

  app.post('/api/macro-changes/:changeId/regenerate', isAuthenticated, async (req: any, res) => {
    try {
      const changeId = parseInt(req.params.changeId);
      
      // Get the existing macro change record
      const [existingChange] = await db
        .select()
        .from(macroChanges)
        .where(eq(macroChanges.id, changeId));
      
      if (!existingChange) {
        return res.status(404).json({ message: "Macro change not found" });
      }
      
      // Get user profile for AI calculation
      const user = await storage.getUser(existingChange.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate fresh AI macro calculation
      const macroRecommendation = await aiCoach.calculateMacroTargets(user);
      
      // Extract baseline macros from existing change
      const baselineMacros = {
        calories: existingChange.oldCalories || 2000,
        protein: existingChange.oldProtein || 150,
        carbs: existingChange.oldCarbs || 200,
        fat: existingChange.oldFat || 65
      };
      
      // Apply Chassidy's gradual approach - max 50 calorie reduction
      const adjustedCalories = Math.max(baselineMacros.calories - 50, 1200);
      
      // Update the existing macro change with new AI calculations
      const [updatedChange] = await db
        .update(macroChanges)
        .set({
          aiCalories: adjustedCalories,
          aiProtein: macroRecommendation.protein,
          aiCarbs: macroRecommendation.carbs,
          aiFat: macroRecommendation.fat,
          aiReasoning: macroRecommendation.reasoning,
          aiProposal: {
            type: 'regenerated_plan',
            reasoning: macroRecommendation.reasoning,
            baseline: baselineMacros,
            adjustments: macroRecommendation.adjustments || []
          }
        })
        .where(eq(macroChanges.id, changeId))
        .returning();
      
      res.json({ 
        message: "Macro change regenerated successfully",
        change: updatedChange
      });
    } catch (error) {
      console.error("Error regenerating macro change:", error);
      res.status(500).json({ message: "Failed to regenerate macro change" });
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

  // Get recent macros for time series analysis
  app.get('/api/trainer/client/:clientId/recent-macros', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { days = '30' } = req.query;
      
      const daysCount = parseInt(days as string);
      const macros = await storage.getRecentMacros(clientId, daysCount);
      
      // Get macro targets for the same period
      const macrosWithTargets = await Promise.all(
        macros.map(async (macro) => {
          const targets = await storage.getUserMacroTargets(clientId, new Date(macro.date));
          return {
            ...macro,
            targetCalories: targets?.calories || 0,
            targetProtein: targets?.protein || 0,
            targetCarbs: targets?.carbs || 0,
            targetFat: targets?.fat || 0,
          };
        })
      );
      
      res.json(macrosWithTargets);
    } catch (error) {
      console.error("Error fetching client recent macros:", error);
      res.status(500).json({ message: "Failed to fetch client recent macros" });
    }
  });

  // Get macro plan updates for a client
  app.get('/api/trainer/client/:clientId/macro-updates', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { days = '30' } = req.query;
      
      const daysCount = parseInt(days as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);
      
      // Get approved macro changes from the macro_changes table
      const macroUpdates = await db
        .select({
          id: macroChanges.id,
          approvedAt: macroChanges.approvedAt,
          finalCalories: macroChanges.finalCalories,
          finalProtein: macroChanges.finalProtein,
          finalCarbs: macroChanges.finalCarbs,
          finalFat: macroChanges.finalFat,
          trainerNotes: macroChanges.trainerNotes,
        })
        .from(macroChanges)
        .where(
          and(
            eq(macroChanges.userId, clientId),
            eq(macroChanges.status, 'approved')
          )
        )
        .orderBy(macroChanges.approvedAt);
      
      res.json(macroUpdates);
    } catch (error) {
      console.error("Error fetching client macro updates:", error);
      res.status(500).json({ message: "Failed to fetch client macro updates" });
    }
  });

  // Get weight progress for a client
  app.get('/api/trainer/client/:clientId/weight-progress', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { days = '90' } = req.query;
      
      const daysCount = parseInt(days as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);
      
      // Get user's goal weight and current weight
      const [user] = await db.select({
        weight: users.weight,
        goalWeight: users.goalWeight,
        goal: users.goal,
        programStartDate: users.programStartDate
      }).from(users).where(eq(users.id, clientId));
      
      // Get weight progress entries
      const weightEntries = await db
        .select({
          id: progressEntries.id,
          weight: progressEntries.weight,
          recordedAt: progressEntries.recordedAt,
          notes: progressEntries.notes
        })
        .from(progressEntries)
        .where(
          and(
            eq(progressEntries.userId, clientId),
            gte(progressEntries.recordedAt, startDate)
          )
        )
        .orderBy(progressEntries.recordedAt);
      
      // Always add baseline weight as first data point (June 9th, 2025)
      const allWeightData = [...weightEntries];
      if (user && user.weight) {
        // Create June 9th baseline entry
        const baselineDate = new Date('2025-06-09T00:00:00.000Z');
        
        // Only add if we don't already have an entry for that exact date
        const hasBaselineEntry = weightEntries.some(entry => {
          const entryDate = new Date(entry.recordedAt);
          return entryDate.toDateString() === baselineDate.toDateString();
        });
        
        if (!hasBaselineEntry) {
          allWeightData.unshift({
            id: 0,
            weight: user.weight, // 180 lbs baseline
            recordedAt: baselineDate,
            notes: 'Baseline weight'
          });
        }
      }
      
      res.json({
        weightEntries: allWeightData,
        goalWeight: user?.goalWeight || null,
        currentWeight: user?.weight || null,
        goal: user?.goal || null
      });
    } catch (error) {
      console.error("Error fetching client weight progress:", error);
      res.status(500).json({ message: "Failed to fetch client weight progress" });
    }
  });


  // Trainer send message to client with PDF report support
  app.post('/api/trainer/client/:clientId/send-message', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { message, isCoach = true, reportData, htmlContent, clientName } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      let finalMessage = message.trim();
      let pdfUrl = null;
      
      // If this includes HTML content for PDF generation, use HTML-to-PDF approach
      if (htmlContent && clientName) {
        // Create HTML document with the same styling as the download version
        const fullHtmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Progress Report - ${clientName}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; }
                .report-container { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .section { margin-bottom: 30px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
                .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .chart-container { height: 300px; margin: 20px 0; }
                .summary-text { line-height: 1.6; margin: 15px 0; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="report-container">
                ${htmlContent}
              </div>
            </body>
          </html>
        `;
        
        // Save HTML content as a file for the client to access
        const htmlFilename = `progress-report-${clientName.replace(/\s+/g, '-')}-${Date.now()}.html`;
        const htmlFilePath = await savePDFToFile(Buffer.from(fullHtmlContent, 'utf8'), htmlFilename);
        
        // Save the coach message with HTML report metadata
        await storage.saveChatMessage({
          userId: clientId,
          message: finalMessage,
          isAI: false,
          metadata: {
            fromCoach: true,
            coachId: req.user.claims.sub,
            hasPdfReport: true,
            pdfUrl: htmlFilePath,
            reportTitle: `Progress Report - ${clientName}`
          }
        });
        
        res.json({ 
          success: true, 
          message: "Message with progress report sent successfully",
          pdfUrl: htmlFilePath
        });
        return;
      }
      
      // If this includes legacy report data, generate PDF using server-side generator
      if (reportData) {
        const reportDate = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const progressData: ProgressReportData = {
          client: reportData.client,
          currentWeight: reportData.currentWeight,
          weightChange: reportData.weightChange,
          avgAdherence: reportData.avgAdherence,
          reportDate
        };
        
        // Generate PDF
        const pdfBuffer = await generateProgressReportPDF(progressData);
        const filename = `progress-report-${reportData.client.firstName}-${reportData.client.lastName}-${Date.now()}.pdf`;
        pdfUrl = await savePDFToFile(pdfBuffer, filename);
        
        // Save the coach message with PDF attachment metadata
        await storage.saveChatMessage({
          userId: clientId,
          message: finalMessage,
          isAI: false,
          metadata: { 
            fromCoach: true, 
            coachId: req.user.claims.sub,
            hasPdfReport: true,
            pdfUrl: pdfUrl,
            reportTitle: `Progress Report - ${reportData.client.firstName} ${reportData.client.lastName}`,
            pdfThumbnail: true
          },
        });
      } else {
        // Save regular coach message
        await storage.saveChatMessage({
          userId: clientId,
          message: finalMessage,
          isAI: false,
          metadata: { fromCoach: true, coachId: req.user.claims.sub },
        });
      }
      
      res.json({ 
        success: true, 
        message: "Message sent successfully",
        pdfUrl: pdfUrl
      });
    } catch (error) {
      console.error("Error sending message to client:", error as Error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Store reports in memory for easy access
  const reportStore = new Map<string, { html: string; title: string; generatedAt: string }>();

  // Serve HTML reports
  app.get('/api/reports/:reportId', async (req, res) => {
    try {
      const { reportId } = req.params;
      
      const report = reportStore.get(reportId);
      if (!report) {
        return res.status(404).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Report Not Found</h1>
              <p>The requested progress report could not be found or may have expired.</p>
            </body>
          </html>
        `);
      }
      
      // Serve the HTML content
      res.setHeader('Content-Type', 'text/html');
      res.send(report.html);
    } catch (error) {
      console.error("Error serving report:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Error Loading Report</h1>
            <p>There was an error loading the progress report. Please try again.</p>
          </body>
        </html>
      `);
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
