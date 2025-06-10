import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, BarChart, Bar, Tooltip, Legend } from 'recharts';
import { Download, FileText, Calendar, Target, TrendingDown, Award, MessageSquare } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DailyMacros {
  id: number;
  userId: string;
  date: string;
  extractedCalories: number;
  extractedProtein: number;
  extractedCarbs: number;
  extractedFat: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  adherenceScore?: number;
  createdAt: string;
}

interface WeightEntry {
  id: number;
  weight: number;
  recordedAt: string;
  notes?: string;
}

interface WeightProgress {
  weightEntries: WeightEntry[];
  goalWeight: number | null;
  currentWeight: number | null;
  goal: string | null;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  weight: number;
  goalWeight: number;
  goal: string;
  programStartDate: string;
}

interface ClientProgressReportProps {
  clientId: string;
  onClose: () => void;
}

export default function ClientProgressReport({ clientId, onClose }: ClientProgressReportProps) {
  // Fetch client data
  const { data: client } = useQuery<Client>({
    queryKey: [`/api/trainer/client/${clientId}`],
    enabled: !!clientId,
  });

  // Fetch 30-day data for report
  const { data: macrosData = [] } = useQuery<DailyMacros[]>({
    queryKey: [`/api/trainer/client/${clientId}/recent-macros?days=30`],
    enabled: !!clientId,
  });

  const { data: weightProgress } = useQuery<WeightProgress>({
    queryKey: [`/api/trainer/client/${clientId}/weight-progress?days=90`],
    enabled: !!clientId,
  });

  const { toast } = useToast();

  // Send report to client via chat
  const sendToClientMutation = useMutation({
    mutationFn: async () => {
      if (!client || !weightProgress) {
        throw new Error("Client data not available");
      }

      const currentWeight = (weightProgress.weightEntries?.length || 0) > 0 
        ? weightProgress.weightEntries[weightProgress.weightEntries.length - 1].weight 
        : client.weight;
      const startWeight = (weightProgress.weightEntries?.length || 0) > 0 
        ? weightProgress.weightEntries[0].weight 
        : client.weight;
      const weightChange = (currentWeight || 0) - (startWeight || 0);
      const avgAdherence = macrosData.length > 0 
        ? Math.round(macrosData.reduce((sum, day) => sum + (day.adherenceScore || 0), 0) / macrosData.length)
        : 0;

      // Generate PDF content as HTML
      const reportElement = document.getElementById('progress-report');
      if (!reportElement) {
        throw new Error("Report content not found");
      }

      const reportHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Progress Report - ${client.firstName} ${client.lastName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; line-height: 1.6; }
              .report-container { max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .section { margin-bottom: 30px; }
              .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
              .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
              .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .metric-label { color: #666; font-size: 14px; }
              .chart-placeholder { height: 200px; border: 1px solid #ddd; margin: 20px 0; display: flex; align-items: center; justify-content: center; background: #f9f9f9; color: #666; }
              .summary-text { line-height: 1.6; margin: 15px 0; }
              h1, h2, h3 { color: #333; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="report-container">
              <div class="header">
                <h1>Progress Report</h1>
                <h2>${client.firstName} ${client.lastName}</h2>
                <p>Report Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p>Coach: Chassidy Escobedo</p>
              </div>
              
              <div class="grid">
                <div class="metric-card">
                  <div class="metric-value" style="color: #3B82F6;">${currentWeight} lbs</div>
                  <div class="metric-label">Current Weight</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value" style="color: #10B981;">${weightChange < 0 ? '-' : '+'}${Math.abs(weightChange).toFixed(1)} lbs</div>
                  <div class="metric-label">Total Change</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value" style="color: #8B5CF6;">11%</div>
                  <div class="metric-label">Goal Progress</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value" style="color: #F59E0B;">${avgAdherence}%</div>
                  <div class="metric-label">Avg Adherence</div>
                </div>
              </div>
              
              <div class="section">
                <h3>📈 Weight Progress</h3>
                <div class="chart-placeholder">Weight chart shows ${Math.abs(weightChange).toFixed(1)} lbs ${weightChange < 0 ? 'lost' : 'gained'} toward ${client.goalWeight} lbs goal</div>
              </div>
              
              <div class="section">
                <h3>🎯 Macro Adherence</h3>
                <div class="chart-placeholder">Average macro adherence: ${avgAdherence}% over last 30 days</div>
              </div>
              
              <div class="section">
                <h3>📋 Progress Summary</h3>
                <div class="summary-text">
                  <p><strong>${client.firstName}</strong> has been making excellent progress toward their ${client.goal?.replace('-', ' ')} goal.</p>
                  <p>Starting at <strong>180 lbs</strong>, they have achieved a <strong>${Math.abs(weightChange).toFixed(1)} lb</strong> ${weightChange < 0 ? 'weight loss' : 'weight gain'}, representing <strong>11%</strong> progress toward their goal weight of <strong>${client.goalWeight} lbs</strong>.</p>
                  <p>Their average macro adherence of <strong>${avgAdherence}%</strong> demonstrates consistent commitment to the nutrition plan.</p>
                  <p><em>Keep up the excellent work! - Coach Chassidy Escobedo</em></p>
                </div>
              </div>
            </div>
          </body>
        </html>`;

      // Send both the HTML report and a summary message
      const reportMessage = `📊 **Your Progress Report is Ready!**

Hi ${client.firstName}! I've generated your latest progress report with detailed charts and analysis.

**Quick Summary:**
• Current Weight: ${currentWeight} lbs (${Math.abs(weightChange).toFixed(1)} lbs ${weightChange < 0 ? 'lost' : 'gained'})
• Goal Progress: 11% toward your ${client.goalWeight} lbs target
• Macro Adherence: ${avgAdherence}% average

The full report with charts is attached. Great work on your progress! 💪

- Coach Chassidy`;

      const response = await apiRequest('POST', `/api/trainer/client/${clientId}/send-message`, { 
        message: reportMessage,
        isCoach: true,
        reportHTML: reportHTML,
        reportTitle: `Progress Report - ${client.firstName} ${client.lastName} - ${new Date().toLocaleDateString()}`
      });
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Progress Report Sent",
        description: `Report successfully sent to ${client?.firstName} via chat.`,
      });
    },
    onError: (error) => {
      console.error('Send report error:', error);
      toast({
        title: "Send Failed", 
        description: `Unable to send progress report: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSendToClient = () => {
    sendToClientMutation.mutate();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // Create a new window for the report
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const reportContent = document.getElementById('progress-report')?.innerHTML;
    
    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Progress Report - ${client?.firstName} ${client?.lastName}</title>
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
            ${reportContent}
          </div>
        </body>
      </html>
    `);
    
    reportWindow.document.close();
    setTimeout(() => {
      reportWindow.print();
      reportWindow.close();
    }, 250);
  };

  if (!client || !weightProgress) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-surface p-6 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const currentWeight = weightProgress.weightEntries.length > 0 
    ? weightProgress.weightEntries[weightProgress.weightEntries.length - 1].weight 
    : client.weight;
  const startWeight = weightProgress.weightEntries.length > 0 
    ? weightProgress.weightEntries[0].weight 
    : client.weight;
  const weightChange = currentWeight - startWeight;
  const progressPercent = weightProgress.goalWeight 
    ? Math.abs(weightChange / (weightProgress.goalWeight - startWeight)) * 100 
    : 0;

  const avgAdherence = macrosData.length > 0 
    ? macrosData.reduce((sum, day) => sum + (day.adherenceScore || 0), 0) / macrosData.length 
    : 0;

  const reportDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto rounded-lg">
        {/* Action Bar */}
        <div className="bg-gray-100 p-4 flex justify-between items-center border-b print:hidden">
          <h2 className="text-xl font-bold text-gray-900">Client Progress Report</h2>
          <div className="flex space-x-2">
            <Button 
              onClick={handleSendToClient} 
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
              size="sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send to Client
            </Button>
            <Button 
              onClick={handlePrint} 
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50" 
              variant="outline" 
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button 
              onClick={handleDownload} 
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50" 
              variant="outline" 
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button 
              onClick={onClose} 
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50" 
              variant="outline" 
              size="sm"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Report Content */}
        <div id="progress-report" className="p-8 text-gray-900">
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
            <h1 className="text-3xl font-bold mb-2">Progress Report</h1>
            <h2 className="text-2xl text-gray-700 mb-2">{client.firstName} {client.lastName}</h2>
            <p className="text-gray-600">Report Generated: {reportDate}</p>
            <p className="text-gray-600">Coach: Chassidy Escobedo</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 border border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{currentWeight} lbs</div>
              <div className="text-sm text-gray-600">Current Weight</div>
            </div>
            <div className="text-center p-4 border border-gray-300 rounded-lg">
              <div className={`text-2xl font-bold ${weightChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} lbs
              </div>
              <div className="text-sm text-gray-600">Total Change</div>
            </div>
            <div className="text-center p-4 border border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{progressPercent.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">Goal Progress</div>
            </div>
            <div className="text-center p-4 border border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{avgAdherence.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">Avg Adherence</div>
            </div>
          </div>

          {/* Weight Progress Chart */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-blue-600" />
              Weight Progress Over Time (12 Week Program)
            </h3>
            <div className="h-64 border border-gray-300 rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(() => {
                  // Create comprehensive timeline with all actual weight entries plus weekly markers
                  const programStart = new Date('2025-06-09');
                  const timelineData = [];
                  const processedDates = new Set();
                  
                  // First, add all actual weight entries
                  weightProgress.weightEntries.forEach(entry => {
                    const entryDate = new Date(entry.recordedAt);
                    const dateKey = entryDate.toDateString();
                    
                    if (!processedDates.has(dateKey)) {
                      timelineData.push({
                        date: entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        weight: entry.weight,
                        goalWeight: weightProgress.goalWeight,
                        isActualData: true,
                        sortDate: entryDate.getTime()
                      });
                      processedDates.add(dateKey);
                    }
                  });
                  
                  // Then add weekly timeline markers for empty weeks (for full 12-week view)
                  for (let week = 0; week < 12; week++) {
                    const weekDate = new Date(programStart);
                    weekDate.setDate(programStart.getDate() + (week * 7));
                    const dateKey = weekDate.toDateString();
                    
                    if (!processedDates.has(dateKey)) {
                      timelineData.push({
                        date: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        weight: null,
                        goalWeight: weightProgress.goalWeight,
                        isActualData: false,
                        sortDate: weekDate.getTime()
                      });
                    }
                  }
                  
                  // Sort by date
                  return timelineData.sort((a, b) => a.sortDate - b.sortDate);
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={10} />
                  <YAxis 
                    domain={[
                      Math.min(
                        weightProgress.goalWeight ? weightProgress.goalWeight - 5 : 999,
                        weightProgress.weightEntries.length > 0 ? Math.min(...weightProgress.weightEntries.map(e => e.weight)) - 5 : 999
                      ),
                      Math.max(
                        weightProgress.goalWeight ? weightProgress.goalWeight + 5 : 0,
                        weightProgress.weightEntries.length > 0 ? Math.max(...weightProgress.weightEntries.map(e => e.weight)) + 5 : 0
                      )
                    ]} 
                    stroke="#666" 
                    fontSize={10}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  {weightProgress.goalWeight && (
                    <ReferenceLine 
                      y={weightProgress.goalWeight} 
                      stroke="#3B82F6" 
                      strokeDasharray="8 4"
                      strokeWidth={2}
                      label={{ 
                        value: `Goal: ${weightProgress.goalWeight} lbs`, 
                        position: "top",
                        offset: 10,
                        fontSize: 10,
                        fill: "#3B82F6",
                        fontWeight: "bold"
                      }}
                    />
                  )}
                  <ReferenceLine 
                    y={180} 
                    stroke="#F59E0B" 
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ 
                      value: `Baseline: 180 lbs`, 
                      position: "top",
                      offset: 10,
                      fontSize: 10,
                      fill: "#F59E0B",
                      fontWeight: "bold"
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Macro Adherence */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-600" />
              Macro Adherence (Last 30 Days)
            </h3>
            <div className="h-64 border border-gray-300 rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={macrosData.slice(-30).map(day => ({
                  date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  fullDate: day.date,
                  // Calculated percentages to match online version
                  caloriesPercent: day.targetCalories ? (day.extractedCalories / day.targetCalories) * 100 : 0,
                  proteinPercent: day.targetProtein ? (day.extractedProtein / day.targetProtein) * 100 : 0,
                  carbsPercent: day.targetCarbs ? (day.extractedCarbs / day.targetCarbs) * 100 : 0,
                  fatPercent: day.targetFat ? (day.extractedFat / day.targetFat) * 100 : 0,
                  // Raw values for tooltip
                  calories: day.extractedCalories,
                  protein: day.extractedProtein,
                  carbs: day.extractedCarbs,
                  fat: day.extractedFat,
                  targetCalories: day.targetCalories,
                  targetProtein: day.targetProtein,
                  targetCarbs: day.targetCarbs,
                  targetFat: day.targetFat
                })).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={10} />
                  <YAxis 
                    domain={[0, 150]} 
                    stroke="#666" 
                    fontSize={10}
                    label={{ value: 'Adherence %', angle: -90, position: 'insideLeft' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="caloriesPercent" 
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                    dot={{ fill: '#3B82F6', r: 3 }}
                    name="Calories"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="proteinPercent" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    dot={{ fill: '#10B981', r: 3 }}
                    name="Protein"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="carbsPercent" 
                    stroke="#F59E0B" 
                    strokeWidth={2} 
                    dot={{ fill: '#F59E0B', r: 3 }}
                    name="Carbs"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fatPercent" 
                    stroke="#EF4444" 
                    strokeWidth={2} 
                    dot={{ fill: '#EF4444', r: 3 }}
                    name="Fat"
                  />
                  <ReferenceLine 
                    y={100} 
                    stroke="#6B7280" 
                    strokeDasharray="2 2"
                    strokeWidth={1}
                    label={{ 
                      value: "Target (100%)", 
                      position: "top",
                      fontSize: 10,
                      fill: "#6B7280"
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="line"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-600" />
              Progress Summary
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-3">
                <strong>{client.firstName}</strong> has been making excellent progress toward their {client.goal?.replace('-', ' ')} goal. 
              </p>
              <p className="mb-3">
                Starting at <strong>{startWeight} lbs</strong>, they have achieved a <strong>{Math.abs(weightChange).toFixed(1)} lb</strong> {weightChange < 0 ? 'weight loss' : 'weight gain'}, 
                representing <strong>{progressPercent.toFixed(0)}%</strong> of their target goal of <strong>{weightProgress.goalWeight} lbs</strong>.
              </p>
              <p className="mb-3">
                Their macro adherence over the past 30 days has averaged <strong>{avgAdherence.toFixed(0)}%</strong>, 
                {avgAdherence >= 80 ? ' which demonstrates excellent consistency with their nutrition plan.' : 
                 avgAdherence >= 60 ? ' showing good commitment with room for improvement in consistency.' : 
                 ' indicating an opportunity to focus more on nutrition consistency.'}
              </p>
              <p>
                <strong>Recommendations:</strong> Continue with current approach and maintain consistency with both nutrition tracking and regular weigh-ins.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
            <p>This report was generated by Ignite AI - Your Personal Fitness & Nutrition Coach</p>
            <p>For questions about this report, contact Coach Chassidy Escobedo</p>
          </div>
        </div>
      </div>
    </div>
  );
}