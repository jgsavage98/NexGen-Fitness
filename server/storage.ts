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
  aiSettings,
  weeklyCheckins,
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
  type AISettings,
  type InsertAISettings,
  type WeeklyCheckin,
  type InsertWeeklyCheckin,
} from "@shared/schema";
import { db } from "./db";
import { eq, ne, desc, and, gte, lte, sql, asc, lt, count, or, isNotNull, not } from "drizzle-orm";

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
  getUserChatMessages(userId: string, limit?: number, chatType?: 'individual' | 'group'): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  saveGroupChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUnreadMessagesCount(userId: string): Promise<number>;
  getGroupChatUnreadCount(userId: string): Promise<number>;
  getIndividualChatUnreadCount(userId: string): Promise<number>;
  markMessagesAsRead(userId: string, messageIds?: number[]): Promise<void>;
  markGroupChatAsViewed(userId: string): Promise<void>;
  getGroupChatMessages(trainerId?: string, limit?: number): Promise<ChatMessage[]>;
  getUnansweredMessageCount(clientId: string, trainerId: string): Promise<number>;
  
  // Trainer chat operations
  getClientChatMessages(clientId: string, trainerId: string, limit?: number): Promise<ChatMessage[]>;
  getPendingChatApprovals(trainerId?: string): Promise<ChatMessage[]>;
  approveChatMessage(messageId: number, trainerId: string, approvedMessage?: string, trainerNotes?: string): Promise<ChatMessage>;
  rejectChatMessage(messageId: number, trainerId: string, trainerNotes: string): Promise<ChatMessage>;
  
  // Progress operations
  getUserProgressEntries(userId: string): Promise<ProgressEntry[]>;
  createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;
  
  // AI Settings operations
  getAISettings(trainerId: string): Promise<any>;
  saveAISettings(trainerId: string, settings: any): Promise<void>;
  
  // Client data operations for trainers
  getClientMacrosForMonth(clientId: string, startDate: Date, endDate: Date): Promise<DailyMacros[]>;
  
  // Exercise operations
  getAllExercises(): Promise<Exercise[]>;
  getExercisesByFilters(filters: {
    exerciseType?: string;
    equipmentType?: string;
    bodyPart?: string;
    difficulty?: string;
  }): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  bulkImportExercises(exercises: InsertExercise[]): Promise<Exercise[]>;
  
  // Weekly check-in operations
  getWeeklyCheckinRecord(clientId: string, weekStartDate: Date): Promise<WeeklyCheckin | undefined>;
  saveWeeklyCheckinRecord(checkin: InsertWeeklyCheckin): Promise<WeeklyCheckin>;
  getTrainerClients(trainerId: string): Promise<User[]>;
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];
    
    return await db
      .select()
      .from(dailyMacros)
      .where(and(
        eq(dailyMacros.userId, userId),
        sql`${dailyMacros.date} >= ${cutoffDateString}`
      ))
      .orderBy(desc(dailyMacros.date));
  }

  async getRecentUploadsAllClients(trainerId?: string, days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select({
        id: dailyMacros.id,
        userId: dailyMacros.userId,
        date: dailyMacros.date,
        screenshotUrl: dailyMacros.screenshotUrl,
        screenshotUploadedAt: dailyMacros.screenshotUploadedAt,
        extractedCalories: dailyMacros.extractedCalories,
        extractedProtein: dailyMacros.extractedProtein,
        extractedCarbs: dailyMacros.extractedCarbs,
        extractedFat: dailyMacros.extractedFat,
        visionConfidence: dailyMacros.visionConfidence,
        adherenceScore: dailyMacros.adherenceScore,
        createdAt: dailyMacros.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(dailyMacros)
      .innerJoin(users, eq(dailyMacros.userId, users.id))
      .where(
        and(
          gte(dailyMacros.createdAt, startDate),
          sql`${dailyMacros.screenshotUrl} IS NOT NULL`,
          eq(users.trainerId, 'coach_chassidy')
        )
      )
      .orderBy(desc(dailyMacros.createdAt));
  }

  async getRecentWeightEntriesAllClients(trainerId?: string, days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select({
        id: progressEntries.id,
        userId: progressEntries.userId,
        weight: progressEntries.weight,
        recordedAt: progressEntries.recordedAt,
        notes: progressEntries.notes,
        createdAt: progressEntries.recordedAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(progressEntries)
      .innerJoin(users, eq(progressEntries.userId, users.id))
      .where(
        and(
          gte(progressEntries.recordedAt, startDate),
          eq(users.trainerId, 'coach_chassidy')
        )
      )
      .orderBy(desc(progressEntries.recordedAt));
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
  async getUserChatMessages(userId: string, limit: number = 50, chatType: 'individual' | 'group' = 'individual'): Promise<ChatMessage[]> {
    if (chatType === 'group') {
      // For group chat, get messages from all clients under the same trainer
      const user = await this.getUser(userId);
      if (!user?.trainerId) {
        return [];
      }
      
      return await db
        .select({
          id: chatMessages.id,
          userId: chatMessages.userId,
          message: chatMessages.message,
          isAI: chatMessages.isAI,
          chatType: chatMessages.chatType,
          metadata: chatMessages.metadata,
          isRead: chatMessages.isRead,
          status: chatMessages.status,
          trainerId: chatMessages.trainerId,
          trainerNotes: chatMessages.trainerNotes,
          approvedAt: chatMessages.approvedAt,
          originalAIResponse: chatMessages.originalAIResponse,
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
        .where(
          and(
            eq(users.trainerId, user.trainerId),
            eq(chatMessages.chatType, 'group'),
            eq(chatMessages.status, 'approved')
          )
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
    } else {
      // Individual chat - include both user messages and Coach Chassidy responses
      return await db
        .select({
          id: chatMessages.id,
          userId: chatMessages.userId,
          message: chatMessages.message,
          isAI: chatMessages.isAI,
          chatType: chatMessages.chatType,
          metadata: chatMessages.metadata,
          isRead: chatMessages.isRead,
          status: chatMessages.status,
          trainerId: chatMessages.trainerId,
          trainerNotes: chatMessages.trainerNotes,
          approvedAt: chatMessages.approvedAt,
          originalAIResponse: chatMessages.originalAIResponse,
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
        .leftJoin(users, eq(chatMessages.userId, users.id))
        .where(
          and(
            or(
              eq(chatMessages.userId, userId), // User's own messages
              and(
                eq(chatMessages.userId, 'coach_chassidy'), // Coach Chassidy's messages
                eq(sql`${chatMessages.metadata}->>'targetUserId'`, userId) // targeted to this user
              )
            ),
            eq(chatMessages.chatType, 'individual'),
            eq(chatMessages.status, 'approved')
          )
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
    }
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    // Auto-approve AI group chat messages for seamless interaction
    // Individual AI messages still require approval
    let status = message.status;
    if (!status) {
      if (message.isAI && message.chatType === 'group') {
        status = 'approved'; // Auto-approve AI group chat messages
      } else if (message.isAI) {
        status = 'pending_approval'; // Individual AI messages need approval
      } else {
        status = 'approved'; // Regular user messages are approved
      }
    }
    
    const messageWithStatus = {
      ...message,
      status,
      approvedAt: status === 'approved' ? new Date() : undefined,
      originalAIResponse: message.isAI ? message.message : undefined
    };

    const [newMessage] = await db.insert(chatMessages).values(messageWithStatus).returning();
    return newMessage;
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    // Use the updated individual chat unread count logic
    const individualCount = await this.getIndividualChatUnreadCount(userId);

    // Count unread group chat messages from other participants (not from this user)
    const groupCount = await this.getGroupChatUnreadCount(userId);
    
    console.log(`Client ${userId} unread counts - Individual: ${individualCount}, Group: ${groupCount}, Total: ${individualCount + groupCount}`);
    
    return individualCount + groupCount;
  }

  async getGroupChatUnreadCount(userId: string): Promise<number> {
    // Get all group chat messages from other participants (including AI messages like Coach Chassidy)
    const groupMessages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          ne(chatMessages.userId, userId), // Not from this user
          eq(chatMessages.chatType, 'group'),
          eq(chatMessages.status, 'approved') // Only approved messages
        )
      );

    // Count messages that haven't been viewed by this user
    let unreadCount = 0;
    for (const message of groupMessages) {
      const metadata = (message.metadata as any) || {};
      let viewedBy = metadata.viewedBy || [];
      
      // Handle case where viewedBy might be a string representation of an array
      if (typeof viewedBy === 'string') {
        try {
          viewedBy = JSON.parse(viewedBy);
        } catch (e) {
          viewedBy = [];
        }
      }
      
      // Ensure viewedBy is an array
      if (!Array.isArray(viewedBy)) {
        viewedBy = [];
      }
      
      if (!viewedBy.includes(userId)) {
        unreadCount++;
        console.log(`Message ${message.id} from ${message.userId} marked as unread for user ${userId}`);
      }
    }

    console.log(`Group chat unread count for user ${userId}: ${unreadCount} (from ${groupMessages.length} total group messages)`);
    return unreadCount;
  }

  async getIndividualChatUnreadCount(userId: string): Promise<number> {
    // Count unread individual chat messages (coach messages targeted at this client)
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, 'coach_chassidy'), // Messages from Coach Chassidy
          eq(chatMessages.chatType, 'individual'),
          eq(chatMessages.isAI, true), // AI messages from coach
          eq(chatMessages.isRead, false),
          eq(chatMessages.status, 'approved'),
          sql`${chatMessages.metadata}->>'targetUserId' = ${userId}` // Targeted at this client
        )
      );

    const count = Number(result[0]?.count) || 0;
    console.log(`Client ${userId} individual chat unread count:`, count);
    return count;
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
      // Mark all unread Coach Chassidy messages targeted at this user as read
      await db
        .update(chatMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(chatMessages.userId, 'coach_chassidy'), // Messages from Coach Chassidy
            eq(chatMessages.chatType, 'individual'),
            eq(chatMessages.isAI, true),
            eq(chatMessages.isRead, false),
            eq(chatMessages.status, 'approved'),
            sql`${chatMessages.metadata}->>'targetUserId' = ${userId}` // Targeted at this client
          )
        );
    }
  }



  async markGroupChatAsViewed(userId: string): Promise<void> {
    // Mark all group chat messages from OTHER users as viewed by this user (including AI messages like Coach Chassidy)
    // We update the metadata to indicate this user has viewed the messages
    const groupMessages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          ne(chatMessages.userId, userId), // Not from this user
          eq(chatMessages.chatType, 'group'),
          eq(chatMessages.status, 'approved') // Only approved messages
        )
      );

    for (const message of groupMessages) {
      const currentMetadata = (message.metadata as any) || {};
      const viewedBy = currentMetadata.viewedBy || [];
      
      if (!viewedBy.includes(userId)) {
        viewedBy.push(userId);
        
        await db
          .update(chatMessages)
          .set({ 
            metadata: {
              ...currentMetadata,
              viewedBy
            }
          })
          .where(eq(chatMessages.id, message.id));
      }
    }
    
    console.log(`Marked group chat messages as viewed by user ${userId}`);
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
      .where(
        and(
          eq(chatMessages.userId, clientId),
          eq(chatMessages.chatType, 'individual')
        )
      )
      .orderBy(chatMessages.createdAt)
      .limit(limit);
    
    return messages;
  }

  async getGroupChatMessages(trainerId?: string, limit: number = 50): Promise<ChatMessage[]> {
    if (trainerId) {
      // Trainer view - get APPROVED messages with user details (same filtering as client view)
      return await db
        .select({
          id: chatMessages.id,
          userId: chatMessages.userId,
          message: chatMessages.message,
          isAI: chatMessages.isAI,
          chatType: chatMessages.chatType,
          metadata: chatMessages.metadata,
          isRead: chatMessages.isRead,
          status: chatMessages.status,
          trainerId: chatMessages.trainerId,
          trainerNotes: chatMessages.trainerNotes,
          approvedAt: chatMessages.approvedAt,
          originalAIResponse: chatMessages.originalAIResponse,
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
        .where(
          and(
            eq(users.trainerId, trainerId),
            eq(chatMessages.chatType, 'group'),
            eq(chatMessages.status, 'approved') // FIXED: Added status filter for consistency
          )
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
    } else {
      // AI context - get all group chat messages
      return await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chatType, 'group'))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
    }
  }

  async getUnansweredMessageCount(clientId: string, trainerId: string): Promise<number> {
    // Get the most recent message from the client that isn't from AI or coach and hasn't been viewed by trainer
    // Exclude group chat messages from individual client unread counts
    const latestUnviewedClientMessage = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, clientId),
          eq(chatMessages.isAI, false),
          sql`(${chatMessages.metadata} IS NULL OR ${chatMessages.metadata}->>'fromCoach' != 'true')`,
          sql`(${chatMessages.metadata} IS NULL OR ${chatMessages.metadata}->>'trainerViewed' != 'true')`,
          ne(chatMessages.chatType, 'group') // Use the chatType column directly
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
          sql`${chatMessages.createdAt} > ${latestUnviewedMessageTime}`,
          ne(chatMessages.chatType, 'group') // Use the chatType column directly
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

  // Exercise operations
  async getAllExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises).orderBy(asc(exercises.name));
  }

  async getExercisesByFilters(filters: {
    exerciseType?: string;
    equipmentType?: string;
    bodyPart?: string;
    difficulty?: string;
  }): Promise<Exercise[]> {
    const conditions = [];
    
    if (filters.exerciseType) {
      conditions.push(eq(exercises.exerciseType, filters.exerciseType));
    }
    if (filters.equipmentType) {
      conditions.push(eq(exercises.equipmentType, filters.equipmentType));
    }
    if (filters.bodyPart) {
      conditions.push(eq(exercises.bodyPart, filters.bodyPart));
    }
    if (filters.difficulty) {
      conditions.push(eq(exercises.difficulty, filters.difficulty));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return await db
      .select()
      .from(exercises)
      .where(whereClause)
      .orderBy(asc(exercises.name));
  }



  async bulkImportExercises(exerciseList: InsertExercise[]): Promise<Exercise[]> {
    if (exerciseList.length === 0) return [];
    
    // Insert in batches of 100 to avoid database limits
    const batchSize = 100;
    const results: Exercise[] = [];
    
    for (let i = 0; i < exerciseList.length; i += batchSize) {
      const batch = exerciseList.slice(i, i + batchSize);
      const batchResults = await db
        .insert(exercises)
        .values(batch)
        .returning();
      results.push(...batchResults);
    }
    
    return results;
  }

  async saveGroupChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const messageWithGroupType = {
      ...message,
      chatType: 'group' as const
    };
    return this.saveChatMessage(messageWithGroupType);
  }

  // AI Settings operations
  async getAISettings(trainerId: string): Promise<any> {
    console.log('Storage: Getting AI settings for trainer:', trainerId);
    // Query for the specific ID format used in saveAISettings
    const results = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.id, `ai_settings_${trainerId}`));
    
    console.log('Storage: Query results:', results.length, 'records found');
    if (results.length > 0) {
      console.log('Storage: Found record ID:', results[0].id);
      console.log('Storage: Settings content keys:', Object.keys(results[0].settings || {}));
      console.log('Storage: Verbosity settings:', {
        groupChatVerbosity: results[0].settings?.groupChat?.verbosity,
        individualChatVerbosity: results[0].settings?.individualChat?.verbosity
      });
    }
    
    const [settings] = results;
    return settings?.settings || null;
  }

  async saveAISettings(trainerId: string, settings: any): Promise<void> {
    console.log('Storage: Saving AI settings for trainer:', trainerId);
    console.log('Storage: Settings to save:', {
      groupChatVerbosity: settings.groupChat?.verbosity,
      individualChatVerbosity: settings.individualChat?.verbosity,
      settingsKeys: Object.keys(settings)
    });
    
    const result = await db
      .insert(aiSettings)
      .values({
        id: `ai_settings_${trainerId}`,
        trainerId,
        settings,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiSettings.id,
        set: {
          settings,
          updatedAt: new Date(),
        },
      });
      
    console.log('Storage: AI settings saved successfully');
    
    // Verify the save by reading back
    const saved = await this.getAISettings(trainerId);
    console.log('Storage: Verification - saved verbosity settings:', {
      groupChatVerbosity: saved?.groupChat?.verbosity,
      individualChatVerbosity: saved?.individualChat?.verbosity
    });
  }

  // Weekly check-in operations
  async getWeeklyCheckinRecord(clientId: string, weekStartDate: Date): Promise<WeeklyCheckin | undefined> {
    const [checkin] = await db
      .select()
      .from(weeklyCheckins)
      .where(
        and(
          eq(weeklyCheckins.clientId, clientId),
          eq(weeklyCheckins.weekStartDate, weekStartDate)
        )
      );
    return checkin;
  }

  async saveWeeklyCheckinRecord(checkin: InsertWeeklyCheckin): Promise<WeeklyCheckin> {
    const [savedCheckin] = await db
      .insert(weeklyCheckins)
      .values(checkin)
      .returning();
    return savedCheckin;
  }

  async getTrainerClients(trainerId: string): Promise<User[]> {
    const clients = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.trainerId, trainerId),
          not(eq(users.id, trainerId)) // Exclude the trainer themselves
        )
      )
      .orderBy(users.firstName);
    return clients;
  }
}

export const storage = new DatabaseStorage();
