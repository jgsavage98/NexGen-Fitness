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

  // Simple admin interface for development
  app.get('/admin/exercises', (req, res) => {
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
