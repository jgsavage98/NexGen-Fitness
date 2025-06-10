import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts';
import { Download, FileText, Calendar, Target, TrendingDown, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
            <Button onClick={handlePrint} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
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
              Weight Progress Over Time
            </h3>
            <div className="h-64 border border-gray-300 rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightProgress.weightEntries.map(entry => ({
                  date: new Date(entry.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  weight: entry.weight,
                  goalWeight: weightProgress.goalWeight
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#2563eb" 
                    strokeWidth={2} 
                    dot={{ fill: '#2563eb', r: 3 }}
                  />
                  {weightProgress.goalWeight && (
                    <ReferenceLine 
                      y={weightProgress.goalWeight} 
                      stroke="#dc2626" 
                      strokeDasharray="4 4"
                      label={{ value: `Goal: ${weightProgress.goalWeight} lbs`, position: "top" }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Macro Adherence */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-600" />
              30-Day Macro Adherence
            </h3>
            <div className="h-48 border border-gray-300 rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={macrosData.slice(-14).map((day, index) => ({
                  date: new Date(day.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
                  adherence: day.adherenceScore || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#666" fontSize={10} />
                  <Bar dataKey="adherence" fill="#10b981" />
                </BarChart>
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