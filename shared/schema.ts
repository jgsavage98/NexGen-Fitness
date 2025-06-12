import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  real,
  boolean,
  date,
  unique,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Ignite-AI profile data
  goal: varchar("goal"), // fitness goal: weight-loss, muscle-gain, maintenance
  weight: real("weight"), // current weight in kg
  goalWeight: real("goal_weight"), // target weight in kg (for weight loss goals)
  height: integer("height"), // in cm
  age: integer("age"),
  gender: varchar("gender"), // male, female
  activityLevel: varchar("activity_level"), // sedentary, light, moderate, active, very_active
  workoutFrequency: integer("workout_frequency"), // sessions per week
  injuries: text("injuries").array().default([]),
  equipment: text("equipment").array().default([]),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  trainerId: varchar("trainer_id").default("coach_chassidy"),
  programStartDate: timestamp("program_start_date"),
  timezone: varchar("timezone").default("America/New_York"),
  profilePicture: varchar("profile_picture"),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  category: varchar("category"), // strength, cardio, flexibility
  exerciseType: varchar("exercise_type"), // Your dataset field: strength, cardio, flexibility, etc.
  equipmentType: varchar("equipment_type"), // Your dataset field: barbell, dumbbell, bodyweight, etc.
  bodyPart: varchar("body_part"), // Your dataset field: chest, legs, back, etc.
  primaryMuscles: text("primary_muscles").array().default([]),
  secondaryMuscles: text("secondary_muscles").array().default([]),
  equipment: varchar("equipment"),
  difficulty: varchar("difficulty"), // beginner, intermediate, advanced
  videoUrl: varchar("video_url"),
  imageUrl: varchar("image_url"),
  animatedGifUrl: varchar("animated_gif_url"), // Your animated GIF field
  regressionId: integer("regression_id"),
  progressionId: integer("progression_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  type: varchar("type"), // strength, cardio, hybrid
  targetMuscleGroups: text("target_muscle_groups").array().default([]),
  estimatedDuration: integer("estimated_duration"), // in minutes
  difficulty: varchar("difficulty"),
  exercises: jsonb("exercises").notNull(), // Array of {exerciseId, sets, reps, weight, rest}
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  workoutId: integer("workout_id"),
  exerciseId: integer("exercise_id").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  weight: real("weight"),
  duration: integer("duration"), // in seconds
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Core Ignite-AI workflow tables
export const trainers = pgTable("trainers", {
  id: varchar("id").primaryKey(), // coach_chassidy
  name: varchar("name").notNull(),
  photoUrl: varchar("photo_url"),
  bio: text("bio"),
  specialties: text("specialties").array().default([]),
  certifications: text("certifications").array().default([]),
  yearsExperience: integer("years_experience").default(0),
  clientsHelped: integer("clients_helped").default(0),
  rating: real("rating").default(0.0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyMacros = pgTable("daily_macros", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  // Screenshot data
  screenshotUrl: varchar("screenshot_url"),
  screenshotUploadedAt: timestamp("screenshot_uploaded_at"),
  // Vision extraction results
  extractedCalories: real("extracted_calories"),
  extractedProtein: real("extracted_protein"),
  extractedCarbs: real("extracted_carbs"),
  extractedFat: real("extracted_fat"),
  visionConfidence: real("vision_confidence"),
  visionProcessedAt: timestamp("vision_processed_at"),
  // Current macro targets
  targetCalories: real("target_calories"),
  targetProtein: real("target_protein"),
  targetCarbs: real("target_carbs"),
  targetFat: real("target_fat"),
  // Compliance tracking
  adherenceScore: real("adherence_score"), // 0-100
  hungerLevel: integer("hunger_level"), // 1-5 scale
  energyLevel: integer("energy_level"), // 1-5 scale
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.userId, table.date)
]);

export const macroChanges = pgTable("macro_changes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  // Previous targets
  oldCalories: real("old_calories"),
  oldProtein: real("old_protein"),
  oldCarbs: real("old_carbs"),
  oldFat: real("old_fat"),
  // AI proposal
  aiProposal: jsonb("ai_proposal"), // Complete AI response
  aiCalories: real("ai_calories"),
  aiProtein: real("ai_protein"),
  aiCarbs: real("ai_carbs"),
  aiFat: real("ai_fat"),
  aiReasoning: text("ai_reasoning"),
  // Final approved values
  finalCalories: real("final_calories"),
  finalProtein: real("final_protein"),
  finalCarbs: real("final_carbs"),
  finalFat: real("final_fat"),
  // Approval tracking
  status: varchar("status").default("pending"), // pending, approved, edited
  trainerId: varchar("trainer_id"),
  trainerNotes: text("trainer_notes"),
  approvedAt: timestamp("approved_at"),
  // Audit trail
  screenshotUrl: varchar("screenshot_url"),
  weightTrend: real("weight_trend"),
  programDay: integer("program_day"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy tables (keeping for compatibility)
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  fiber: real("fiber"),
  sugar: real("sugar"),
  mealType: varchar("meal_type"),
  loggedAt: timestamp("logged_at").defaultNow(),
});

export const macroTargets = pgTable("macro_targets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateUnique: unique("macro_targets_user_date_unique").on(table.userId, table.date),
}));

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  message: text("message").notNull(),
  isAI: boolean("is_ai").default(false),
  chatType: varchar("chat_type").default("individual"), // individual, group
  metadata: jsonb("metadata"), // voice duration, confidence scores, etc.
  isRead: boolean("is_read").default(false),
  // Trainer approval workflow
  status: varchar("status").default("approved"), // approved, pending_approval, rejected
  trainerId: varchar("trainer_id"),
  trainerNotes: text("trainer_notes"),
  approvedAt: timestamp("approved_at"),
  originalAIResponse: text("original_ai_response"), // Store original AI response before trainer edits
  createdAt: timestamp("created_at").defaultNow(),
});

export const progressEntries = pgTable("progress_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weight: real("weight"),
  bodyFat: real("body_fat"),
  muscleMass: real("muscle_mass"),
  measurements: jsonb("measurements"), // chest, waist, arms, etc.
  photos: text("photos").array().default([]),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  workouts: many(workouts),
  workoutLogs: many(workoutLogs),
  meals: many(meals),
  macroTargets: many(macroTargets),
  chatMessages: many(chatMessages),
  progressEntries: many(progressEntries),
  dailyMacros: many(dailyMacros),
  macroChanges: many(macroChanges),
  trainer: one(trainers, {
    fields: [users.trainerId],
    references: [trainers.id],
  }),
}));

export const trainersRelations = relations(trainers, ({ many }) => ({
  clients: many(users),
  macroChanges: many(macroChanges),
}));

export const dailyMacrosRelations = relations(dailyMacros, ({ one }) => ({
  user: one(users, {
    fields: [dailyMacros.userId],
    references: [users.id],
  }),
}));

export const macroChangesRelations = relations(macroChanges, ({ one }) => ({
  user: one(users, {
    fields: [macroChanges.userId],
    references: [users.id],
  }),
  trainer: one(trainers, {
    fields: [macroChanges.trainerId],
    references: [trainers.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ many, one }) => ({
  workoutLogs: many(workoutLogs),
  regression: one(exercises, {
    fields: [exercises.regressionId],
    references: [exercises.id],
  }),
  progression: one(exercises, {
    fields: [exercises.progressionId],
    references: [exercises.id],
  }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, {
    fields: [workouts.userId],
    references: [users.id],
  }),
  workoutLogs: many(workoutLogs),
}));

export const workoutLogsRelations = relations(workoutLogs, ({ one }) => ({
  user: one(users, {
    fields: [workoutLogs.userId],
    references: [users.id],
  }),
  workout: one(workouts, {
    fields: [workoutLogs.workoutId],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [workoutLogs.exerciseId],
    references: [exercises.id],
  }),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
  user: one(users, {
    fields: [meals.userId],
    references: [users.id],
  }),
}));

export const macroTargetsRelations = relations(macroTargets, ({ one }) => ({
  user: one(users, {
    fields: [macroTargets.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const progressEntriesRelations = relations(progressEntries, ({ one }) => ({
  user: one(users, {
    fields: [progressEntries.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainerSchema = createInsertSchema(trainers).omit({
  createdAt: true,
});

export const insertDailyMacrosSchema = createInsertSchema(dailyMacros).omit({
  id: true,
  createdAt: true,
});

export const insertMacroChangesSchema = createInsertSchema(macroChanges).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({
  id: true,
  completedAt: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  loggedAt: true,
});

export const insertMacroTargetSchema = createInsertSchema(macroTargets).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertProgressEntrySchema = createInsertSchema(progressEntries).omit({
  id: true,
  recordedAt: true,
});

// Update user profile schema for new PRD
export const updateUserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  profileImageUrl: z.string().optional(),
  goal: z.string().optional(),
  weight: z.number().optional(),
  goalWeight: z.number().optional(),
  height: z.number().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  activityLevel: z.string().optional(),
  workoutFrequency: z.number().optional(),
  injuries: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
  programStartDate: z.date().optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;


export type Trainer = typeof trainers.$inferSelect;
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;
export type DailyMacros = typeof dailyMacros.$inferSelect;
export type InsertDailyMacros = z.infer<typeof insertDailyMacrosSchema>;
export type MacroChanges = typeof macroChanges.$inferSelect;
export type InsertMacroChanges = z.infer<typeof insertMacroChangesSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type MacroTarget = typeof macroTargets.$inferSelect;
export type InsertMacroTarget = z.infer<typeof insertMacroTargetSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ProgressEntry = typeof progressEntries.$inferSelect;
export type InsertProgressEntry = z.infer<typeof insertProgressEntrySchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
