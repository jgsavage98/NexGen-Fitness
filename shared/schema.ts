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
  // Fitness profile data
  goal: varchar("goal"), // weight-loss, muscle-gain, maintenance
  height: integer("height"), // in cm
  weight: real("weight"), // in kg
  age: integer("age"),
  gender: varchar("gender"), // male, female
  activityLevel: varchar("activity_level"), // sedentary, light, moderate, active, very_active
  injuries: text("injuries").array().default([]),
  equipment: text("equipment").array().default([]),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  category: varchar("category"), // strength, cardio, flexibility
  primaryMuscles: text("primary_muscles").array().default([]),
  secondaryMuscles: text("secondary_muscles").array().default([]),
  equipment: varchar("equipment"),
  difficulty: varchar("difficulty"), // beginner, intermediate, advanced
  videoUrl: varchar("video_url"),
  imageUrl: varchar("image_url"),
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

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(), // in grams
  carbs: real("carbs").notNull(), // in grams
  fat: real("fat").notNull(), // in grams
  fiber: real("fiber"),
  sugar: real("sugar"),
  mealType: varchar("meal_type"), // breakfast, lunch, dinner, snack
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
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  message: text("message").notNull(),
  isAI: boolean("is_ai").default(false),
  metadata: jsonb("metadata"), // voice duration, confidence scores, etc.
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
export const usersRelations = relations(users, ({ many }) => ({
  workouts: many(workouts),
  workoutLogs: many(workoutLogs),
  meals: many(meals),
  macroTargets: many(macroTargets),
  chatMessages: many(chatMessages),
  progressEntries: many(progressEntries),
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

// Update user profile schema
export const updateUserProfileSchema = createInsertSchema(users).pick({
  goal: true,
  height: true,
  weight: true,
  age: true,
  gender: true,
  activityLevel: true,
  injuries: true,
  equipment: true,
}).extend({
  onboardingCompleted: z.boolean().optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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
