import { aiCoach } from './openai.js';
import { storage } from './storage.js';
import { applyResponseFiltering } from './openai.js';
import { generateProgressReportPDF, savePDFToFile, generatePDFThumbnail, type ProgressReportData } from './pdfGenerator.js';

interface WeeklyCheckinData {
  client: any;
  weeklyMacros: any[];
  weeklyWeightEntries: any[];
  recentChatHistory: any[];
  adherenceMetrics: {
    macroUploads: number;
    totalDaysInWeek: number;
    uploadPercentage: number;
    avgCaloriesCompliance: number;
    avgProteinCompliance: number;
    weightLogCount: number;
  };
}

class WeeklyCheckinScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    
    console.log('🗓️ Weekly Check-in Scheduler: Starting background service');
    this.isRunning = true;
    
    // Check every 30 minutes for Tuesday 9am ET
    this.intervalId = setInterval(() => {
      this.checkAndSendWeeklyCheckins();
    }, 30 * 60 * 1000); // 30 minutes

    // Also check immediately on startup
    setTimeout(() => this.checkAndSendWeeklyCheckins(), 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🗓️ Weekly Check-in Scheduler: Stopped');
  }

  private async checkAndSendWeeklyCheckins() {
    try {
      const now = new Date();
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      
      // Check if it's Tuesday and between 9:00-9:30 AM ET
      const dayOfWeek = etTime.getDay(); // 0 = Sunday, 2 = Tuesday
      const hour = etTime.getHours();
      const minute = etTime.getMinutes();
      
      const isTuesday = dayOfWeek === 2;
      const isTargetTime = hour === 9 && minute < 30; // 9:00-9:29 AM ET window
      
      console.log(`🗓️ Time check: ${hour}:${minute.toString().padStart(2, '0')} on ${dayOfWeek === 2 ? 'Tuesday' : 'other day'}, target time: ${isTargetTime}`);
      
      if (!isTuesday || !isTargetTime) {
        return; // Not the right time
      }

      console.log('🗓️ Weekly Check-in: Tuesday 9am ET detected, generating check-ins...');

      // Get all Coach Chassidy's clients
      const clients = await storage.getTrainerClients('coach_chassidy');
      
      for (const client of clients) {
        await this.generateWeeklyCheckinForClient(client);
        // Add delay between clients to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error('🗓️ Weekly Check-in Error:', error);
    }
  }

  private async generateWeeklyCheckinForClient(client: any) {
    try {
      console.log(`🗓️ Generating weekly check-in for ${client.firstName} ${client.lastName}`);

      // Check if we already sent a check-in this week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 2); // This Tuesday
      startOfWeek.setHours(0, 0, 0, 0);

      const existingCheckin = await storage.getWeeklyCheckinRecord(client.id, startOfWeek);
      if (existingCheckin) {
        console.log(`✅ Weekly check-in already sent to ${client.firstName} this week - forcing new one for PDF testing`);
        // Continue with generation for PDF testing
      }

      // Gather comprehensive client data for the past week
      const weeklyData = await this.gatherWeeklyClientData(client);
      
      // Generate AI-powered weekly check-in message
      const checkinMessage = await this.generateCheckinMessage(weeklyData);
      
      // Generate PDF progress report
      const pdfReportData = await this.generatePDFReportData(weeklyData);
      const pdfBuffer = await generateProgressReportPDF(pdfReportData);
      
      // Save PDF to file system
      const reportDate = today.toISOString().split('T')[0];
      const pdfFilename = `${client.firstName}_${client.lastName}_Progress_Report_${reportDate}.pdf`;
      const pdfPath = await savePDFToFile(pdfBuffer, pdfFilename);
      
      console.log(`📄 Generated PDF progress report: ${pdfPath}`);
      
      // Create enhanced message with PDF attachment reference
      const messageWithPDF = `${checkinMessage}\n\n📊 Your detailed progress report is attached: ${pdfFilename}`;
      
      // Get AI settings for filtering
      const aiSettings = await storage.getAISettings('coach_chassidy');
      
      // Apply content filtering
      const filteredMessage = applyResponseFiltering(
        messageWithPDF,
        aiSettings?.individualChat?.responseFiltering
      );

      // Save the check-in message to individual chat
      await storage.saveChatMessage({
        userId: client.id,
        message: filteredMessage,
        isAI: true,
        status: 'approved',
        metadata: {
          fromCoach: true,
          trainerId: 'coach_chassidy',
          messageType: 'weekly_checkin',
          checkinDate: today.toISOString(),
          pdfReportPath: pdfPath,
          pdfFilename: pdfFilename
        }
      });

      // Record that we sent this week's check-in
      await storage.saveWeeklyCheckinRecord({
        clientId: client.id,
        checkinDate: today,
        weekStartDate: startOfWeek,
        messageContent: filteredMessage
      });

      // Broadcast to WebSocket clients for real-time updates
      if ((global as any).wss) {
        (global as any).wss.clients.forEach((wsClient: any) => {
          if (wsClient.readyState === 1) { // WebSocket.OPEN
            wsClient.send(JSON.stringify({
              type: 'individual_message_update',
              userId: client.id
            }));
          }
        });
      }

      console.log(`✅ Weekly check-in sent to ${client.firstName} with PDF report`);

    } catch (error) {
      console.error(`❌ Failed to generate weekly check-in for ${client.firstName}:`, error);
    }
  }

  private async generatePDFReportData(weeklyData: WeeklyCheckinData): Promise<ProgressReportData> {
    const client = weeklyData.client;
    
    // Calculate current weight from recent weight entries
    const currentWeight = weeklyData.weeklyWeightEntries.length > 0 
      ? weeklyData.weeklyWeightEntries[0].weight 
      : client.weight;
    
    // Calculate weight change (current vs starting weight)
    const weightChange = currentWeight - client.weight;
    
    // Calculate average adherence percentage
    const avgAdherence = weeklyData.adherenceMetrics.uploadPercentage;
    
    // Format report date
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return {
      client: {
        firstName: client.firstName,
        lastName: client.lastName,
        weight: client.weight,
        goalWeight: client.goalWeight,
        goal: client.goal
      },
      currentWeight: currentWeight,
      weightChange: weightChange,
      avgAdherence: avgAdherence,
      reportDate: reportDate
    };
  }

  private async gatherWeeklyClientData(client: any): Promise<WeeklyCheckinData> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get weekly macro uploads
    const weeklyMacros = await storage.getRecentMacros(client.id, 7);
    
    // Get weekly weight entries
    const weeklyWeightEntries = await storage.getUserProgressEntries(client.id);
    const recentWeightEntries = weeklyWeightEntries.filter(entry => {
      if (!entry.recordedAt) return false;
      const recordedDate = typeof entry.recordedAt === 'string' ? new Date(entry.recordedAt) : entry.recordedAt;
      return recordedDate >= oneWeekAgo;
    });

    // Get recent chat history (last 20 messages)
    const recentChatHistory = await storage.getClientChatMessages(client.id, 'coach_chassidy', 20);
    
    // Calculate adherence metrics
    const adherenceMetrics = this.calculateAdherenceMetrics(weeklyMacros, recentWeightEntries);

    return {
      client,
      weeklyMacros,
      weeklyWeightEntries: recentWeightEntries,
      recentChatHistory,
      adherenceMetrics
    };
  }

  private calculateAdherenceMetrics(weeklyMacros: any[], weeklyWeightEntries: any[]) {
    const totalDaysInWeek = 7;
    const macroUploads = weeklyMacros.length;
    const uploadPercentage = Math.round((macroUploads / totalDaysInWeek) * 100);

    // Calculate average macro compliance
    let avgCaloriesCompliance = 0;
    let avgProteinCompliance = 0;

    if (weeklyMacros.length > 0) {
      const caloriesCompliance = weeklyMacros.map(macro => {
        const target = macro.targetCalories || 2000;
        const actual = macro.extractedCalories || 0;
        return Math.min(100, (actual / target) * 100);
      });

      const proteinCompliance = weeklyMacros.map(macro => {
        const target = macro.targetProtein || 150;
        const actual = macro.extractedProtein || 0;
        return Math.min(100, (actual / target) * 100);
      });

      avgCaloriesCompliance = Math.round(
        caloriesCompliance.reduce((sum, val) => sum + val, 0) / caloriesCompliance.length
      );

      avgProteinCompliance = Math.round(
        proteinCompliance.reduce((sum, val) => sum + val, 0) / proteinCompliance.length
      );
    }

    return {
      macroUploads,
      totalDaysInWeek,
      uploadPercentage,
      avgCaloriesCompliance,
      avgProteinCompliance,
      weightLogCount: weeklyWeightEntries.length
    };
  }

  private async generateCheckinMessage(data: WeeklyCheckinData): Promise<string> {
    const { client, weeklyMacros, weeklyWeightEntries, recentChatHistory, adherenceMetrics } = data;

    // Build comprehensive context for AI
    const context = this.buildWeeklyContext(data);

    // Generate AI response using the coaching system
    const aiResponse = await aiCoach.getChatResponse(
      `Generate a personalized weekly check-in message for ${client.firstName}. This is their scheduled Tuesday morning progress review. ${context}`,
      client,
      [], // No immediate message history for context
      false, // isPendingApproval
      false, // isGroupChat
      'verbose' // Always verbose for weekly check-ins
    );

    // Get AI settings for content filtering
    const { storage } = await import('./storage');
    const { applyResponseFiltering } = await import('./openai');
    
    try {
      const aiSettings = await storage.getAISettings('coach_chassidy');
      const filterConfig = aiSettings?.responseFiltering?.individualChat;
      
      // Apply content filtering to the weekly check-in message
      const filteredMessage = applyResponseFiltering(aiResponse.message, filterConfig);
      
      return filteredMessage;
    } catch (error) {
      console.error('Error applying content filtering to weekly check-in:', error);
      return aiResponse.message; // Return unfiltered if filtering fails
    }
  }

  private buildWeeklyContext(data: WeeklyCheckinData): string {
    const { client, weeklyMacros, weeklyWeightEntries, recentChatHistory, adherenceMetrics } = data;

    let context = `WEEKLY CHECK-IN CONTEXT for ${client.firstName}:\n\n`;

    // Goal and basic info
    context += `CLIENT PROFILE:\n`;
    context += `- Goal: ${client.goal} (${client.weight} lbs → ${client.goalWeight} lbs)\n`;
    context += `- Age: ${client.age}, Gender: ${client.gender}\n`;
    context += `- Activity Level: ${client.activityLevel}\n\n`;

    // Adherence metrics
    context += `WEEKLY ADHERENCE (Past 7 days):\n`;
    context += `- Macro uploads: ${adherenceMetrics.macroUploads}/${adherenceMetrics.totalDaysInWeek} days (${adherenceMetrics.uploadPercentage}%)\n`;
    context += `- Average calories compliance: ${adherenceMetrics.avgCaloriesCompliance}%\n`;
    context += `- Average protein compliance: ${adherenceMetrics.avgProteinCompliance}%\n`;
    context += `- Weight logs: ${adherenceMetrics.weightLogCount} entries\n\n`;

    // Recent macro data
    if (weeklyMacros.length > 0) {
      context += `RECENT MACRO DATA:\n`;
      weeklyMacros.slice(0, 5).forEach(macro => {
        const date = new Date(macro.date).toLocaleDateString();
        context += `- ${date}: ${macro.extractedCalories}cal, ${macro.extractedProtein}g protein, ${macro.extractedCarbs}g carbs, ${macro.extractedFat}g fat\n`;
      });
      context += `\n`;
    }

    // Weight progress
    if (weeklyWeightEntries.length > 0) {
      context += `WEIGHT PROGRESS:\n`;
      weeklyWeightEntries.slice(0, 3).forEach(entry => {
        const date = new Date(entry.recordedAt).toLocaleDateString();
        context += `- ${date}: ${entry.weight} lbs\n`;
      });
      context += `\n`;
    }

    // Recent chat themes (summarize key topics)
    if (recentChatHistory.length > 0) {
      context += `RECENT CONVERSATION THEMES:\n`;
      const recentMessages = recentChatHistory.slice(0, 10);
      const clientMessages = recentMessages.filter(msg => !msg.isAI);
      if (clientMessages.length > 0) {
        context += `- Client has been discussing: ${clientMessages.map(msg => msg.message.substring(0, 100)).join('; ')}\n`;
      }
      context += `\n`;
    }

    context += `WEEKLY CHECK-IN GUIDELINES:\n`;
    context += `- Provide encouraging, specific feedback on their progress\n`;
    context += `- Address any adherence challenges with supportive guidance\n`;
    context += `- Celebrate wins and improvements, no matter how small\n`;
    context += `- Give actionable advice for the upcoming week\n`;
    context += `- Reference specific data points to show you're paying attention\n`;
    context += `- Keep tone warm, motivational, and coach-like\n`;
    context += `- End with a question to encourage engagement\n`;

    return context;
  }

  // Manual trigger for testing
  async triggerWeeklyCheckinNow(clientId?: string) {
    try {
      console.log('🧪 Manual weekly check-in trigger activated - forcing PDF generation test');
      
      if (clientId) {
        const client = await storage.getUser(clientId);
        if (client) {
          // Force generation for PDF testing by temporarily bypassing weekly check
          await this.generateWeeklyCheckinForClientWithPDF(client);
          return `Weekly check-in with PDF generated for ${client.firstName}`;
        } else {
          return 'Client not found';
        }
      } else {
        // Generate for all clients
        const clients = await storage.getTrainerClients('coach_chassidy');
        for (const client of clients) {
          await this.generateWeeklyCheckinForClientWithPDF(client);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return `Weekly check-ins with PDFs generated for ${clients.length} clients`;
      }
    } catch (error: any) {
      console.error('Manual trigger error:', error);
      return `Error: ${error?.message || 'Unknown error'}`;
    }
  }

  // Force PDF generation for testing
  private async generateWeeklyCheckinForClientWithPDF(client: any) {
    try {
      console.log(`🧪 TESTING: Generating weekly check-in with PDF for ${client.firstName} ${client.lastName}`);

      // Gather comprehensive client data for the past week
      const weeklyData = await this.gatherWeeklyClientData(client);
      
      // Generate AI-powered weekly check-in message
      const checkinMessage = await this.generateCheckinMessage(weeklyData);
      
      // Generate PDF progress report
      console.log('📄 Generating PDF progress report...');
      const pdfReportData = await this.generatePDFReportData(weeklyData);
      const pdfBuffer = await generateProgressReportPDF(pdfReportData);
      
      // Save PDF to file system
      const today = new Date();
      const reportDate = today.toISOString().split('T')[0];
      const pdfFilename = `${client.firstName}_${client.lastName}_Progress_Report_${reportDate}_TEST.pdf`;
      const pdfPath = await savePDFToFile(pdfBuffer, pdfFilename);
      
      console.log(`✅ PDF generated successfully: ${pdfPath}`);
      
      // Generate PDF thumbnail
      console.log('🖼️ Generating PDF thumbnail...');
      const thumbnailPath = await generatePDFThumbnail(pdfPath, pdfFilename);
      console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
      
      // Create enhanced message with PDF thumbnail and download link
      const messageWithPDF = `${checkinMessage}\n\n📊 Your detailed progress report is ready!\n\n🔗 View & Download Report: ${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}${pdfPath}`;
      
      // Get AI settings for filtering
      const aiSettings = await storage.getAISettings('coach_chassidy');
      
      // Apply content filtering
      const filteredMessage = applyResponseFiltering(
        messageWithPDF,
        aiSettings?.individualChat?.responseFiltering
      );

      // Save the test check-in message to individual chat
      await storage.saveChatMessage({
        userId: client.id,
        message: filteredMessage,
        isAI: true,
        status: 'approved',
        metadata: {
          fromCoach: true,
          trainerId: 'coach_chassidy',
          messageType: 'weekly_checkin_test',
          checkinDate: today.toISOString(),
          pdfReportPath: pdfPath,
          pdfFilename: pdfFilename,
          thumbnailPath: thumbnailPath
        }
      });

      // Broadcast to WebSocket clients for real-time updates
      if ((global as any).wss) {
        (global as any).wss.clients.forEach((wsClient: any) => {
          if (wsClient.readyState === 1) { // WebSocket.OPEN
            wsClient.send(JSON.stringify({
              type: 'individual_message_update',
              userId: client.id
            }));
          }
        });
      }

      console.log(`✅ TEST: Weekly check-in with PDF sent to ${client.firstName}`);

    } catch (error) {
      console.error(`❌ TEST FAILED: Failed to generate weekly check-in with PDF for ${client.firstName}:`, error);
      throw error;
    }
  }
}

export const weeklyCheckinScheduler = new WeeklyCheckinScheduler();