import { storage } from './storage';
import WebSocket from 'ws';

interface ScheduledPost {
  trainerId: string;
  nextPostTime: Date;
  lastPostTime?: Date;
}

class TopicScheduler {
  private scheduledPosts: Map<string, ScheduledPost> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Auto Topic Generation scheduler started');
    
    // Check every 5 minutes for posts that need to be sent
    this.checkInterval = setInterval(() => {
      this.checkAndPostTopics();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial check
    this.checkAndPostTopics();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Auto Topic Generation scheduler stopped');
  }

  private async checkAndPostTopics() {
    try {
      // Get all trainers with auto topic generation enabled
      const trainers = await this.getTrainersWithAutoTopics();
      
      for (const trainer of trainers) {
        await this.processTrainer(trainer);
      }
    } catch (error) {
      console.error('Error in topic scheduler:', error);
    }
  }

  private async getTrainersWithAutoTopics(): Promise<Array<{trainerId: string, settings: any}>> {
    try {
      // For now, we only support coach_chassidy
      const settings = await storage.getAISettings('coach_chassidy');
      
      if (settings?.groupChat?.autoTopicGeneration) {
        return [{ trainerId: 'coach_chassidy', settings }];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting trainers with auto topics:', error);
      return [];
    }
  }

  private async processTrainer(trainer: {trainerId: string, settings: any}) {
    const { trainerId, settings } = trainer;
    const now = new Date();
    
    // Get or create scheduled post info
    let scheduledPost = this.scheduledPosts.get(trainerId);
    
    if (!scheduledPost) {
      // First time - schedule next post
      scheduledPost = {
        trainerId,
        nextPostTime: this.calculateNextPostTime(settings, now)
      };
      this.scheduledPosts.set(trainerId, scheduledPost);
      console.log(`Scheduled first auto topic for ${trainerId} at ${scheduledPost.nextPostTime}`);
      return;
    }

    // Check if it's time to post
    if (now >= scheduledPost.nextPostTime) {
      await this.postAutoTopic(trainerId, settings);
      
      // Schedule next post
      scheduledPost.lastPostTime = now;
      scheduledPost.nextPostTime = this.calculateNextPostTime(settings, now);
      
      console.log(`Next auto topic for ${trainerId} scheduled for ${scheduledPost.nextPostTime}`);
    }
  }

  private calculateNextPostTime(settings: any, fromTime: Date): Date {
    const frequency = settings.groupChat?.topicFrequency || 24; // Default to 24 hours
    
    // Convert frequency from hours to milliseconds
    const frequencyMs = frequency * 60 * 60 * 1000;
    
    const nextTime = new Date(fromTime.getTime() + frequencyMs);
    
    // Adjust to random time between 12pm-2pm ET
    return this.adjustToPostingWindow(nextTime);
  }

  private adjustToPostingWindow(targetDate: Date): Date {
    // Convert to ET (UTC-5 or UTC-4 depending on DST)
    const etOffset = this.getETOffset(targetDate);
    
    // Set to a random time between 12pm-2pm ET
    const randomHour = 12 + Math.random() * 2; // 12.0 to 14.0
    const randomMinute = Math.floor(Math.random() * 60);
    
    const postDate = new Date(targetDate);
    postDate.setUTCHours(randomHour + etOffset, randomMinute, 0, 0);
    
    // If the calculated time is in the past, move to next day
    if (postDate <= new Date()) {
      postDate.setUTCDate(postDate.getUTCDate() + 1);
    }
    
    return postDate;
  }

  private getETOffset(date: Date): number {
    // Simple DST check - DST runs from 2nd Sunday in March to 1st Sunday in November
    const year = date.getFullYear();
    const march = new Date(year, 2, 1); // March 1st
    const november = new Date(year, 10, 1); // November 1st
    
    // Find second Sunday in March
    const dstStart = new Date(march);
    dstStart.setDate(1 + (7 - march.getDay()) % 7 + 7); // Second Sunday
    
    // Find first Sunday in November  
    const dstEnd = new Date(november);
    dstEnd.setDate(1 + (7 - november.getDay()) % 7); // First Sunday
    
    // Check if date is in DST period
    const isDST = date >= dstStart && date < dstEnd;
    
    return isDST ? 4 : 5; // EDT is UTC-4, EST is UTC-5
  }

  private async postAutoTopic(trainerId: string, settings: any) {
    try {
      console.log(`Generating auto topic for ${trainerId}`);
      
      // Generate topic using existing function
      const topic = await this.generateAutoTopic(settings);
      
      if (!topic) {
        console.error(`Failed to generate auto topic for ${trainerId}`);
        return;
      }

      // Save as group chat message
      const savedMessage = await storage.saveGroupChatMessage({
        userId: trainerId,
        message: topic,
        isAI: true,
        metadata: { 
          isAutoGenerated: true, 
          topicType: 'scheduled',
          scheduledAt: new Date().toISOString()
        }
      });

      console.log(`Auto topic posted for ${trainerId}: "${topic.substring(0, 50)}..."`);

      // Broadcast to WebSocket clients
      const wss = (global as any).wss;
      if (wss) {
        const messageData = {
          type: 'new_group_message',
          data: {
            ...savedMessage,
            senderName: 'Coach Chassidy'
          }
        };

        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify(messageData));
          }
        });

        // Also send counter update
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'group_counter_update'
            }));
          }
        });
      }

    } catch (error) {
      console.error(`Error posting auto topic for ${trainerId}:`, error);
    }
  }

  private async generateAutoTopic(settings?: any): Promise<string | null> {
    try {
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const categories = settings?.groupChat?.topicCategories || ['nutrition', 'workouts', 'motivation'];
      const style = settings?.groupChat?.topicStyle || 'engaging';
      const customPrompts = settings?.groupChat?.customTopicPrompts || '';
      const avoidRepetition = settings?.groupChat?.avoidTopicRepetition || false;
      
      // Get current day of week and time context
      const now = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = dayNames[now.getDay()];
      const hour = now.getHours();
      
      let timeContext = '';
      if (hour < 12) {
        timeContext = 'morning';
      } else if (hour < 17) {
        timeContext = 'afternoon';
      } else {
        timeContext = 'evening';
      }
      
      // Get recent topics to avoid repetition if enabled
      let recentTopicsContext = '';
      if (avoidRepetition) {
        const recentTopics = await this.getRecentAutoTopics();
        if (recentTopics.length > 0) {
          recentTopicsContext = `\n\nRECENT TOPICS TO AVOID REPEATING:\n${recentTopics.map(t => `- ${t}`).join('\n')}`;
        }
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Coach Chassidy (Rachel Freiman from MindStrong Fitness), creating an engaging discussion topic for your fitness and nutrition group chat.

CURRENT CONTEXT:
- Today is ${currentDay}
- Time of day: ${timeContext}

TOPIC REQUIREMENTS:
- Focus on these categories: ${categories.join(', ')}
- Style: ${style}
- Keep it relevant to fitness, nutrition, health, and wellness
- Make it engaging and encourage client participation
- Keep it positive and motivational
- Use Coach Chassidy's warm, upbeat, straight-talking "knowledgeable best friend with teacher energy" voice

IMPORTANT HASHTAG RULES:
- Only use day-specific hashtags that match today (${currentDay})
- Do NOT use #MotivationMonday unless it's actually Monday
- Do NOT use #TransformationTuesday unless it's actually Tuesday  
- Do NOT use #WellnessWednesday unless it's actually Wednesday
- Do NOT use #ThrowbackThursday unless it's actually Thursday
- Do NOT use #FridayFeels unless it's actually Friday
- Use general hashtags instead when the day doesn't match
- Examples of safe general hashtags: #FitnessJourney #HealthyLiving #NutritionTips #WorkoutMotivation

${customPrompts ? `CUSTOM FOCUS AREAS: ${customPrompts}` : ''}

TOPIC STYLES:
- engaging: Ask questions that encourage sharing and discussion
- educational: Share tips with questions to engage
- challenges: Propose fun fitness/nutrition challenges
- discussions: Open-ended questions about experiences
- tips: Quick tips with follow-up questions

Generate a single topic post that Coach Chassidy would make. Keep it conversational, supportive, and focused on the chosen categories. Include an engaging question or call-to-action.

Example formats for ${currentDay} ${timeContext}:
- "Good ${timeContext}, team! 💪 Who's trying a new recipe this week? Share what you're excited to cook!"
- "${currentDay} Check-in: What's your favorite way to stay active when you're short on time?"
- "Nutrition tip: Did you know that eating protein with every meal helps keep you fuller longer? What's your go-to protein source?"

${recentTopicsContext}

Respond with just the topic post, ready to be sent to the group.`
          }
        ],
        temperature: 0.7,
      });

      return response.choices[0].message.content?.trim() || null;
    } catch (error) {
      console.error("Error generating auto topic:", error);
      return null;
    }
  }

  private async getRecentAutoTopics(): Promise<string[]> {
    try {
      // Get last 5 auto-generated topics to avoid repetition
      const messages = await storage.getGroupChatMessages(undefined, 20);
      
      return messages
        .filter(m => m.isAI && m.metadata && (m.metadata as any).isAutoGenerated)
        .map(m => m.message)
        .slice(0, 5);
    } catch (error) {
      console.error('Error getting recent auto topics:', error);
      return [];
    }
  }

  // Method to manually trigger a topic (for testing)
  async triggerManualTopic(trainerId: string) {
    try {
      const settings = await storage.getAISettings(trainerId);
      if (settings?.groupChat?.autoTopicGeneration) {
        await this.postAutoTopic(trainerId, settings);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error triggering manual topic:', error);
      return false;
    }
  }
}

export const topicScheduler = new TopicScheduler();