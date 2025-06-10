import {
  users,
  trainers,
  dailyMacros,
  macroChanges,
  exercises,
  workouts,
  workoutLogs,
  meals,
  macroTargets,
  chatMessages,
  progressEntries,
  type User,
  type UpsertUser,
  type Trainer,
  type InsertTrainer,
  type DailyMacros,
  type InsertDailyMacros,
  type MacroChanges,
  type InsertMacroChanges,
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
import { eq, desc, and, gte, lte, sql, asc, lt, count, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, profile: UpdateUserProfile): Promise<User>;
  
  // Trainer operations
  getTrainer(id: string): Promise<Trainer | undefined>;
  upsertTrainer(trainer: InsertTrainer): Promise<Trainer>;
  getAllTrainers(): Promise<Trainer[]>;
  
  // Daily macros operations (core PRD workflow)
  getDailyMacros(userId: string, date: Date): Promise<DailyMacros | undefined>;
  createDailyMacros(macros: InsertDailyMacros): Promise<DailyMacros>;
  updateDailyMacros(id: number, updates: Partial<InsertDailyMacros>): Promise<DailyMacros>;
  getRecentMacros(userId: string, days: number): Promise<DailyMacros[]>;
  
  // Macro changes operations (Coach Chassidy approval)
  createMacroChange(change: InsertMacroChanges): Promise<MacroChanges>;
  getPendingMacroChanges(trainerId?: string): Promise<MacroChanges[]>;
  approveMacroChange(id: number, trainerId: string, trainerNotes?: string): Promise<MacroChanges>;
  editMacroChange(id: number, trainerId: string, finalMacros: any, trainerNotes?: string): Promise<MacroChanges>;
  
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
  
  // Legacy operations (keeping for compatibility)
  getUserMeals(userId: string, date?: Date): Promise<Meal[]>;
  logMeal(meal: InsertMeal): Promise<Meal>;
  getUserMacroTargets(userId: string, date: Date): Promise<MacroTarget | undefined>;
  setMacroTargets(targets: InsertMacroTarget): Promise<MacroTarget>;
  
  // Chat operations
  getUserChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUnreadMessagesCount(userId: string): Promise<number>;
  markMessagesAsRead(userId: string, messageIds?: number[]): Promise<void>;
  
  // Trainer chat operations
  getClientChatMessages(clientId: string, trainerId: string, limit?: number): Promise<ChatMessage[]>;
  getUnansweredMessageCount(clientId: string, trainerId: string): Promise<number>;
  getPendingChatApprovals(trainerId?: string): Promise<ChatMessage[]>;
  approveChatMessage(messageId: number, trainerId: string, approvedMessage?: string, trainerNotes?: string): Promise<ChatMessage>;
  rejectChatMessage(messageId: number, trainerId: string, trainerNotes: string): Promise<ChatMessage>;
  
  // Progress operations
  getUserProgressEntries(userId: string): Promise<ProgressEntry[]>;
  createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;
  
  // Client data operations for trainers
  getClientMacrosForMonth(clientId: string, startDate: Date, endDate: Date): Promise<DailyMacros[]>;
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

  // Trainer operations
  async getTrainer(id: string): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer;
  }

  async upsertTrainer(trainer: InsertTrainer): Promise<Trainer> {
    const [upsertedTrainer] = await db
      .insert(trainers)
      .values(trainer)
      .onConflictDoUpdate({
        target: trainers.id,
        set: trainer,
      })
      .returning();
    return upsertedTrainer;
  }

  async getAllTrainers(): Promise<Trainer[]> {
    return await db.select().from(trainers);
  }

  // Daily macros operations (core PRD workflow)
  async getDailyMacros(userId: string, date: Date): Promise<DailyMacros | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    const [macros] = await db
      .select()
      .from(dailyMacros)
      .where(and(eq(dailyMacros.userId, userId), eq(dailyMacros.date, dateStr)));
    return macros;
  }

  async createDailyMacros(macros: InsertDailyMacros): Promise<DailyMacros> {
    const [newMacros] = await db.insert(dailyMacros).values(macros).returning();
    return newMacros;
  }

  async updateDailyMacros(id: number, updates: Partial<InsertDailyMacros>): Promise<DailyMacros> {
    const [updatedMacros] = await db
      .update(dailyMacros)
      .set(updates)
      .where(eq(dailyMacros.id, id))
      .returning();
    return updatedMacros;
  }

  async getRecentMacros(userId: string, days: number): Promise<DailyMacros[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select()
      .from(dailyMacros)
      .where(and(
        eq(dailyMacros.userId, userId),
        gte(dailyMacros.date, startDate.toISOString().split('T')[0])
      ))
      .orderBy(desc(dailyMacros.date));
  }

  // Macro changes operations (Coach Chassidy approval)
  async createMacroChange(change: InsertMacroChanges): Promise<MacroChanges> {
    const [newChange] = await db.insert(macroChanges).values(change).returning();
    return newChange;
  }

  async getPendingMacroChanges(trainerId?: string): Promise<MacroChanges[]> {
    const conditions = [eq(macroChanges.status, 'pending')];
    if (trainerId) {
      conditions.push(eq(macroChanges.trainerId, trainerId));
    }
    
    return await db
      .select()
      .from(macroChanges)
      .where(and(...conditions))
      .orderBy(desc(macroChanges.createdAt));
  }

  async approveMacroChange(id: number, trainerId: string, trainerNotes?: string): Promise<MacroChanges> {
    const [approvedChange] = await db
      .update(macroChanges)
      .set({
        status: 'approved',
        trainerId,
        trainerNotes,
        approvedAt: new Date(),
        finalCalories: sql`ai_calories`,
        finalProtein: sql`ai_protein`,
        finalCarbs: sql`ai_carbs`,
        finalFat: sql`ai_fat`,
      })
      .where(eq(macroChanges.id, id))
      .returning();

    // Create active macro targets from approved plan
    await this.setMacroTargets({
      userId: approvedChange.userId,
      date: approvedChange.date,
      calories: approvedChange.aiCalories!,
      protein: approvedChange.aiProtein!,
      carbs: approvedChange.aiCarbs!,
      fat: approvedChange.aiFat!,
    });

    return approvedChange;
  }

  async editMacroChange(id: number, trainerId: string, finalMacros: any, trainerNotes?: string): Promise<MacroChanges> {
    const [editedChange] = await db
      .update(macroChanges)
      .set({
        status: 'edited',
        trainerId,
        trainerNotes,
        approvedAt: new Date(),
        finalCalories: finalMacros.calories,
        finalProtein: finalMacros.protein,
        finalCarbs: finalMacros.carbs,
        finalFat: finalMacros.fat,
      })
      .where(eq(macroChanges.id, id))
      .returning();

    // Create active macro targets from edited/approved plan
    await this.setMacroTargets({
      userId: editedChange.userId,
      date: editedChange.date,
      calories: finalMacros.calories,
      protein: finalMacros.protein,
      carbs: finalMacros.carbs,
      fat: finalMacros.fat,
    });

    return editedChange;
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
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db
        .select()
        .from(workoutLogs)
        .where(
          and(
            eq(workoutLogs.userId, userId),
            gte(workoutLogs.completedAt, startOfDay),
            lte(workoutLogs.completedAt, endOfDay)
          )
        )
        .orderBy(desc(workoutLogs.completedAt));
    }
    
    return await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.completedAt));
  }

  // Meal operations
  async getUserMeals(userId: string, date?: Date): Promise<Meal[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db
        .select()
        .from(meals)
        .where(
          and(
            eq(meals.userId, userId),
            gte(meals.loggedAt, startOfDay),
            lte(meals.loggedAt, endOfDay)
          )
        )
        .orderBy(desc(meals.loggedAt));
    }
    
    return await db
      .select()
      .from(meals)
      .where(eq(meals.userId, userId))
      .orderBy(desc(meals.loggedAt));
  }

  async logMeal(meal: InsertMeal): Promise<Meal> {
    const [newMeal] = await db.insert(meals).values(meal).returning();
    return newMeal;
  }

  // Macro target operations
  async getUserMacroTargets(userId: string, date: Date): Promise<MacroTarget | undefined> {
    const dateString = date.toISOString().split('T')[0];
    
    // First try to get targets for the specific date
    const [targets] = await db
      .select()
      .from(macroTargets)
      .where(
        and(
          eq(macroTargets.userId, userId),
          eq(macroTargets.date, dateString)
        )
      );
    
    if (targets) {
      return targets;
    }
    
    // If no targets for today, get the most recent targets for this user
    const [mostRecentTargets] = await db
      .select()
      .from(macroTargets)
      .where(eq(macroTargets.userId, userId))
      .orderBy(desc(macroTargets.date))
      .limit(1);
    
    return mostRecentTargets;
  }

  async setMacroTargets(targets: InsertMacroTarget): Promise<MacroTarget> {
    // First try to find existing targets
    const [existing] = await db
      .select()
      .from(macroTargets)
      .where(
        and(
          eq(macroTargets.userId, targets.userId),
          eq(macroTargets.date, targets.date)
        )
      );

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(macroTargets)
        .set({
          calories: targets.calories,
          protein: targets.protein,
          carbs: targets.carbs,
          fat: targets.fat,
        })
        .where(eq(macroTargets.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [newTargets] = await db
        .insert(macroTargets)
        .values(targets)
        .returning();
      return newTargets;
    }
  }

  // Chat operations
  async getUserChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.status, 'approved') // Only show approved messages to clients
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    // If this is an AI message, set it to pending approval by default
    const messageWithStatus = {
      ...message,
      status: message.isAI ? 'pending_approval' : 'approved',
      originalAIResponse: message.isAI ? message.message : undefined
    };

    const [newMessage] = await db.insert(chatMessages).values(messageWithStatus).returning();
    return newMessage;
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.isRead, false),
          eq(chatMessages.status, 'approved'),
          // Count approved AI responses OR messages from coach (not user's own messages)
          eq(chatMessages.isAI, true)
        )
      );
    
    return Number(result[0]?.count) || 0;
  }

  async markMessagesAsRead(userId: string, messageIds?: number[]): Promise<void> {
    if (messageIds && messageIds.length > 0) {
      // Mark specific messages as read - use a simple loop for now
      for (const messageId of messageIds) {
        await db
          .update(chatMessages)
          .set({ isRead: true })
          .where(
            and(
              eq(chatMessages.userId, userId),
              eq(chatMessages.id, messageId)
            )
          );
      }
    } else {
      // Mark all unread approved messages as read (both coach messages and AI responses)
      await db
        .update(chatMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.isRead, false),
            eq(chatMessages.status, 'approved')
          )
        );
    }
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
  async getClientMacrosForMonth(clientId: string, startDate: Date, endDate: Date): Promise<DailyMacros[]> {
    const macros = await db
      .select()
      .from(dailyMacros)
      .where(
        and(
          eq(dailyMacros.userId, clientId),
          gte(dailyMacros.date, startDate.toISOString().split('T')[0]),
          lte(dailyMacros.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(asc(dailyMacros.date));
    
    return macros;
  }

  // Trainer chat operations
  async getClientChatMessages(clientId: string, trainerId: string, limit: number = 50): Promise<ChatMessage[]> {
    // Verify trainer has access to this client
    const client = await this.getUser(clientId);
    if (!client || client.trainerId !== trainerId) {
      throw new Error("Unauthorized access to client chat");
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, clientId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);
    
    return messages;
  }

  async getUnansweredMessageCount(clientId: string, trainerId: string): Promise<number> {
    // Get the most recent message from the client that isn't from AI or coach and hasn't been viewed by trainer
    const latestUnviewedClientMessage = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, clientId),
          eq(chatMessages.isAI, false),
          sql`(${chatMessages.metadata} IS NULL OR ${chatMessages.metadata}->>'fromCoach' != 'true')`,
          sql`(${chatMessages.metadata} IS NULL OR ${chatMessages.metadata}->>'trainerViewed' != 'true')`
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    if (latestUnviewedClientMessage.length === 0) {
      return 0; // No unviewed client messages
    }

    const latestUnviewedMessageTime = latestUnviewedClientMessage[0].createdAt;

    // Check if there's any DIRECT trainer response (not AI) after the latest unviewed client message
    const trainerResponseAfter = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, clientId),
          sql`${chatMessages.metadata}->>'fromCoach' = 'true'`,
          sql`${chatMessages.createdAt} > ${latestUnviewedMessageTime}`
        )
      )
      .limit(1);

    // If no direct trainer response after latest unviewed client message, count as unanswered
    return trainerResponseAfter.length === 0 ? 1 : 0;
  }

  async getPendingChatApprovals(trainerId?: string): Promise<ChatMessage[]> {
    const whereClause = trainerId 
      ? and(
          eq(chatMessages.status, 'pending_approval'),
          eq(users.trainerId, trainerId),
          // Exclude messages directly from coach
          sql`NOT (${chatMessages.metadata}->>'fromCoach' = 'true')`
        )
      : and(
          eq(chatMessages.status, 'pending_approval'),
          // Exclude messages directly from coach
          sql`NOT (${chatMessages.metadata}->>'fromCoach' = 'true')`
        );

    const pendingMessages = await db
      .select({
        id: chatMessages.id,
        userId: chatMessages.userId,
        message: chatMessages.message,
        isAI: chatMessages.isAI,
        metadata: chatMessages.metadata,
        isRead: chatMessages.isRead,
        status: chatMessages.status,
        trainerId: chatMessages.trainerId,
        trainerNotes: chatMessages.trainerNotes,
        approvedAt: chatMessages.approvedAt,
        originalAIResponse: chatMessages.originalAIResponse,
        createdAt: chatMessages.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(whereClause)
      .orderBy(desc(chatMessages.createdAt));

    // For each pending AI message, find the previous user message using raw SQL
    const enrichedMessages = await Promise.all(
      pendingMessages.map(async (message) => {
        const previousUserMessage = await db.execute(
          sql`
            SELECT message, created_at 
            FROM chat_messages 
            WHERE user_id = ${message.userId} 
              AND is_ai = false 
              AND created_at < ${message.createdAt}
            ORDER BY created_at DESC 
            LIMIT 1
          `
        );

        return {
          ...message,
          clientQuestion: previousUserMessage.rows[0]?.message || 'No previous question found',
          clientQuestionTime: previousUserMessage.rows[0]?.created_at || message.createdAt,
        };
      })
    );
      
    return enrichedMessages as any;
  }

  async approveChatMessage(messageId: number, trainerId: string, approvedMessage?: string, trainerNotes?: string): Promise<ChatMessage> {
    const [message] = await db
      .update(chatMessages)
      .set({
        status: 'approved',
        trainerId,
        trainerNotes,
        approvedAt: new Date(),
        isRead: false, // Mark as unread so client sees notification badge
        ...(approvedMessage && { message: approvedMessage })
      })
      .where(eq(chatMessages.id, messageId))
      .returning();
    
    return message;
  }

  async rejectChatMessage(messageId: number, trainerId: string, trainerNotes: string): Promise<ChatMessage> {
    const [message] = await db
      .update(chatMessages)
      .set({
        status: 'rejected',
        trainerId,
        trainerNotes,
        approvedAt: new Date()
      })
      .where(eq(chatMessages.id, messageId))
      .returning();
    
    return message;
  }
}

export const storage = new DatabaseStorage();
