import {
  users,
  exercises,
  workouts,
  workoutLogs,
  meals,
  macroTargets,
  chatMessages,
  progressEntries,
  type User,
  type UpsertUser,
  type Exercise,
  type InsertExercise,
  type Workout,
  type InsertWorkout,
  type WorkoutLog,
  type InsertWorkoutLog,
  type Meal,
  type InsertMeal,
  type MacroTarget,
  type InsertMacroTarget,
  type ChatMessage,
  type InsertChatMessage,
  type ProgressEntry,
  type InsertProgressEntry,
  type UpdateUserProfile,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, profile: UpdateUserProfile): Promise<User>;
  
  // Exercise operations
  getExercises(): Promise<Exercise[]>;
  getExerciseById(id: number): Promise<Exercise | undefined>;
  getExercisesByCategory(category: string): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // Workout operations
  getUserWorkouts(userId: string): Promise<Workout[]>;
  getWorkoutById(id: number): Promise<Workout | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  getTodaysWorkout(userId: string): Promise<Workout | undefined>;
  
  // Workout log operations
  logWorkoutExercise(log: InsertWorkoutLog): Promise<WorkoutLog>;
  getUserWorkoutLogs(userId: string, date?: Date): Promise<WorkoutLog[]>;
  
  // Meal operations
  getUserMeals(userId: string, date?: Date): Promise<Meal[]>;
  logMeal(meal: InsertMeal): Promise<Meal>;
  
  // Macro target operations
  getUserMacroTargets(userId: string, date: Date): Promise<MacroTarget | undefined>;
  setMacroTargets(targets: InsertMacroTarget): Promise<MacroTarget>;
  
  // Chat operations
  getUserChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Progress operations
  getUserProgressEntries(userId: string): Promise<ProgressEntry[]>;
  createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, profile: UpdateUserProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Exercise operations
  async getExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises);
  }

  async getExerciseById(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async getExercisesByCategory(category: string): Promise<Exercise[]> {
    return await db.select().from(exercises).where(eq(exercises.category, category));
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [newExercise] = await db.insert(exercises).values(exercise).returning();
    return newExercise;
  }

  // Workout operations
  async getUserWorkouts(userId: string): Promise<Workout[]> {
    return await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.createdAt));
  }

  async getWorkoutById(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const [newWorkout] = await db.insert(workouts).values(workout).returning();
    return newWorkout;
  }

  async getTodaysWorkout(userId: string): Promise<Workout | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [workout] = await db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.createdAt, today),
          lte(workouts.createdAt, tomorrow)
        )
      )
      .orderBy(desc(workouts.createdAt))
      .limit(1);
    
    return workout;
  }

  // Workout log operations
  async logWorkoutExercise(log: InsertWorkoutLog): Promise<WorkoutLog> {
    const [newLog] = await db.insert(workoutLogs).values(log).returning();
    return newLog;
  }

  async getUserWorkoutLogs(userId: string, date?: Date): Promise<WorkoutLog[]> {
    let query = db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId));
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(
        and(
          eq(workoutLogs.userId, userId),
          gte(workoutLogs.completedAt, startOfDay),
          lte(workoutLogs.completedAt, endOfDay)
        )
      );
    }
    
    return await query.orderBy(desc(workoutLogs.completedAt));
  }

  // Meal operations
  async getUserMeals(userId: string, date?: Date): Promise<Meal[]> {
    let query = db.select().from(meals).where(eq(meals.userId, userId));
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(
        and(
          eq(meals.userId, userId),
          gte(meals.loggedAt, startOfDay),
          lte(meals.loggedAt, endOfDay)
        )
      );
    }
    
    return await query.orderBy(desc(meals.loggedAt));
  }

  async logMeal(meal: InsertMeal): Promise<Meal> {
    const [newMeal] = await db.insert(meals).values(meal).returning();
    return newMeal;
  }

  // Macro target operations
  async getUserMacroTargets(userId: string, date: Date): Promise<MacroTarget | undefined> {
    const [targets] = await db
      .select()
      .from(macroTargets)
      .where(
        and(
          eq(macroTargets.userId, userId),
          eq(macroTargets.date, date.toISOString().split('T')[0])
        )
      );
    return targets;
  }

  async setMacroTargets(targets: InsertMacroTarget): Promise<MacroTarget> {
    const [newTargets] = await db
      .insert(macroTargets)
      .values(targets)
      .onConflictDoUpdate({
        target: [macroTargets.userId, macroTargets.date],
        set: targets,
      })
      .returning();
    return newTargets;
  }

  // Chat operations
  async getUserChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  // Progress operations
  async getUserProgressEntries(userId: string): Promise<ProgressEntry[]> {
    return await db
      .select()
      .from(progressEntries)
      .where(eq(progressEntries.userId, userId))
      .orderBy(desc(progressEntries.recordedAt));
  }

  async createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry> {
    const [newEntry] = await db.insert(progressEntries).values(entry).returning();
    return newEntry;
  }
}

export const storage = new DatabaseStorage();
