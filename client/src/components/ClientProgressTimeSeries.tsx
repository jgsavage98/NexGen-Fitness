import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart, ReferenceLine, Dot } from 'recharts';
import { Heart, Zap, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";

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
  hungerLevel?: number;
  energyLevel?: number;
  adherenceScore?: number;
  createdAt: string;
}

interface MacroUpdate {
  id: number;
  approvedAt: string;
  finalCalories: number;
  finalProtein: number;
  finalCarbs: number;
  finalFat: number;
  trainerNotes?: string;
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
  programStartDate: string;
  timezone: string;
}

interface ClientProgressTimeSeriesProps {
  clientId: string;
}

export default function ClientProgressTimeSeries({ clientId }: ClientProgressTimeSeriesProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [viewType, setViewType] = useState<'macros' | 'wellness' | 'adherence' | 'weight'>('macros');

  // Fetch client data
  const { data: client } = useQuery<Client>({
    queryKey: [`/api/trainer/client/${clientId}`],
    enabled: !!clientId,
  });

  // Fetch recent macros based on time range
  const getDaysForRange = (range: string) => {
    switch (range) {
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  };

  const { data: macrosData = [] } = useQuery<DailyMacros[]>({
    queryKey: [`/api/trainer/client/${clientId}/recent-macros?days=${getDaysForRange(timeRange)}`],
    enabled: !!clientId,
  });

  // Fetch macro updates/changes for markers
  const { data: macroUpdates = [] } = useQuery<MacroUpdate[]>({
    queryKey: [`/api/trainer/client/${clientId}/macro-updates?days=${getDaysForRange(timeRange)}`],
    enabled: !!clientId,
  });

  // Fetch weight progress data
  const { data: weightProgress } = useQuery<WeightProgress>({
    queryKey: [`/api/trainer/client/${clientId}/weight-progress?days=${getDaysForRange(timeRange)}`],
    enabled: !!clientId,
  });

  // Process data for charts
  const processedData = macrosData.map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: day.date,
    // Macro data
    calories: day.extractedCalories,
    protein: day.extractedProtein,
    carbs: day.extractedCarbs,
    fat: day.extractedFat,
    targetCalories: day.targetCalories,
    targetProtein: day.targetProtein,
    targetCarbs: day.targetCarbs,
    targetFat: day.targetFat,
    // Calculated percentages
    caloriesPercent: day.targetCalories ? (day.extractedCalories / day.targetCalories) * 100 : 0,
    proteinPercent: day.targetProtein ? (day.extractedProtein / day.targetProtein) * 100 : 0,
    carbsPercent: day.targetCarbs ? (day.extractedCarbs / day.targetCarbs) * 100 : 0,
    fatPercent: day.targetFat ? (day.extractedFat / day.targetFat) * 100 : 0,
    // Wellness data
    hungerLevel: day.hungerLevel,
    energyLevel: day.energyLevel,
    adherenceScore: day.adherenceScore,
  })).reverse(); // Most recent first

  const calculateTrend = (data: any[], key: string) => {
    if (data.length < 2) return 'stable';
    const recent = data.slice(-3);
    const older = data.slice(-6, -3);
    
    if (recent.length < 1 || older.length < 1) return 'stable';
    
    const recentAvg = recent.reduce((sum, item) => sum + (item[key] || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + (item[key] || 0), 0) / older.length;
    
    if (recentAvg > olderAvg * 1.05) return 'improving';
    if (recentAvg < olderAvg * 0.95) return 'declining';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? Math.round(entry.value) : entry.value}
              {entry.name.includes('Percent') ? '%' : 
               entry.name.includes('Level') ? '/5' :
               entry.name.includes('calories') || entry.name === 'calories' ? ' cal' : 'g'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate summary stats
  const avgAdherence = processedData.reduce((sum, day) => {
    const dayAdherence = [
      day.caloriesPercent,
      day.proteinPercent,
      day.carbsPercent,
      day.fatPercent
    ].filter(p => p > 0).reduce((a, b) => a + Math.min(100, b), 0) / 4;
    return sum + dayAdherence;
  }, 0) / (processedData.length || 1);

  const avgHunger = processedData.filter(d => d.hungerLevel).reduce((sum, d) => sum + d.hungerLevel!, 0) / 
    (processedData.filter(d => d.hungerLevel).length || 1);

  const avgEnergy = processedData.filter(d => d.energyLevel).reduce((sum, d) => sum + d.energyLevel!, 0) / 
    (processedData.filter(d => d.energyLevel).length || 1);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">
            {client?.firstName} {client?.lastName} - Progress Analysis
          </h3>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="macros">Macros</SelectItem>
              <SelectItem value="wellness">Wellness</SelectItem>
              <SelectItem value="adherence">Adherence</SelectItem>
              <SelectItem value="weight">Weight Progress</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-24 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="14d">14 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Adherence</p>
                <p className="text-xl font-bold text-white">{Math.round(avgAdherence)}%</p>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-400" />
                {getTrendIcon(calculateTrend(processedData, 'adherenceScore'))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Hunger</p>
                <p className="text-xl font-bold text-white">{avgHunger.toFixed(1)}/5</p>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-400" />
                {getTrendIcon(calculateTrend(processedData, 'hungerLevel'))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Energy</p>
                <p className="text-xl font-bold text-white">{avgEnergy.toFixed(1)}/5</p>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                {getTrendIcon(calculateTrend(processedData, 'energyLevel'))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Data Points</p>
                <p className="text-xl font-bold text-white">{processedData.length}</p>
              </div>
              <div className="text-gray-400">
                <span className="text-xs">days tracked</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {viewType === 'macros' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Macro Intake vs Targets */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Daily Macro Intake vs Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="protein" stroke="#10B981" strokeWidth={2} name="Protein" />
                  <Line type="monotone" dataKey="targetProtein" stroke="#10B981" strokeDasharray="5 5" name="Target Protein" />
                  <Line type="monotone" dataKey="carbs" stroke="#F59E0B" strokeWidth={2} name="Carbs" />
                  <Line type="monotone" dataKey="targetCarbs" stroke="#F59E0B" strokeDasharray="5 5" name="Target Carbs" />
                  <Line type="monotone" dataKey="fat" stroke="#EF4444" strokeWidth={2} name="Fat" />
                  <Line type="monotone" dataKey="targetFat" stroke="#EF4444" strokeDasharray="5 5" name="Target Fat" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Macro Percentages */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Macro Target Achievement (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="proteinPercent" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Protein %" />
                  <Area type="monotone" dataKey="carbsPercent" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="Carbs %" />
                  <Area type="monotone" dataKey="fatPercent" stackId="3" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Fat %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === 'wellness' && (
        <div className="grid grid-cols-1 gap-6">
          {/* Wellness Metrics with Macro Update Markers */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Wellness Levels Over Time
                <span className="text-sm text-gray-400 ml-2">
                  (Markers show macro plan updates)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#9CA3AF" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Wellness trend lines */}
                  <Line 
                    type="monotone" 
                    dataKey="hungerLevel" 
                    stroke="#EF4444" 
                    strokeWidth={3} 
                    name="Hunger Level"
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energyLevel" 
                    stroke="#F59E0B" 
                    strokeWidth={3} 
                    name="Energy Level"
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  
                  {/* Macro update markers */}
                  {macroUpdates.map((update, index) => {
                    const updateDate = new Date(update.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <ReferenceLine 
                        key={update.id}
                        x={updateDate} 
                        stroke="#10B981" 
                        strokeDasharray="8 4"
                        strokeWidth={2}
                        label={{ 
                          value: "Plan Updated", 
                          position: "top",
                          offset: 10,
                          fontSize: 12,
                          fill: "#10B981",
                          fontWeight: "bold"
                        }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
              
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-0.5 bg-red-400"></div>
                  <span className="text-gray-300">Hunger Level (1=Satisfied, 5=Very Hungry)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-0.5 bg-yellow-400"></div>
                  <span className="text-gray-300">Energy Level (1=Low, 5=High)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-0.5 bg-green-400 border-dashed"></div>
                  <span className="text-gray-300">Macro Plan Updates</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Macro Updates Timeline */}
          {macroUpdates.length > 0 && (
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Macro Plan Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {macroUpdates.slice(0, 5).map((update) => (
                    <div key={update.id} className="flex items-start space-x-4 p-4 bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0 w-3 h-3 bg-green-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">
                            Plan Updated
                          </span>
                          <span className="text-gray-400 text-sm">
                            {new Date(update.approvedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Calories:</span>
                            <span className="text-white ml-1">{update.finalCalories}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Protein:</span>
                            <span className="text-white ml-1">{update.finalProtein}g</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Carbs:</span>
                            <span className="text-white ml-1">{update.finalCarbs}g</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Fat:</span>
                            <span className="text-white ml-1">{update.finalFat}g</span>
                          </div>
                        </div>
                        {update.trainerNotes && (
                          <div className="mt-2 text-gray-300 text-sm">
                            <span className="text-gray-400">Notes:</span> {update.trainerNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {viewType === 'adherence' && (
        <div className="grid grid-cols-1 gap-6">
          {/* Overall Adherence Trend */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Macro Adherence Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="caloriesPercent" stroke="#3B82F6" strokeWidth={2} name="Calories %" />
                  <Line type="monotone" dataKey="proteinPercent" stroke="#10B981" strokeWidth={2} name="Protein %" />
                  <Line type="monotone" dataKey="carbsPercent" stroke="#F59E0B" strokeWidth={2} name="Carbs %" />
                  <Line type="monotone" dataKey="fatPercent" stroke="#EF4444" strokeWidth={2} name="Fat %" />
                  {/* 100% reference line */}
                  <Line type="monotone" dataKey={() => 100} stroke="#6B7280" strokeDasharray="2 2" name="100% Target" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === 'weight' && weightProgress && (
        <div className="grid grid-cols-1 gap-6">
          {/* Weight Progress Chart */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Weight Progress Over Time
                {weightProgress.goalWeight && (
                  <span className="text-sm text-gray-400 ml-2">
                    (Goal: {weightProgress.goalWeight} lbs)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={weightProgress.weightEntries.map(entry => ({
                  date: new Date(entry.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  weight: entry.weight,
                  goalWeight: weightProgress.goalWeight,
                  fullDate: entry.recordedAt,
                  notes: entry.notes
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
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
                    stroke="#9CA3AF" 
                    fontSize={12}
                    label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                            <p className="text-white font-medium">{label}</p>
                            <p className="text-green-400">
                              Weight: {payload[0].value} lbs
                            </p>
                            {data.goalWeight && (
                              <p className="text-blue-400">
                                Goal: {data.goalWeight} lbs
                              </p>
                            )}
                            {data.notes && (
                              <p className="text-gray-300 text-sm mt-1">
                                {data.notes}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Weight progress line */}
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    name="Weight"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                  />
                  
                  {/* Goal weight reference line */}
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
                        fontSize: 12,
                        fill: "#3B82F6",
                        fontWeight: "bold"
                      }}
                    />
                  )}
                  
                  {/* Starting weight reference line */}
                  {weightProgress.weightEntries.length > 0 && (
                    <ReferenceLine 
                      y={weightProgress.weightEntries[0].weight} 
                      stroke="#F59E0B" 
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{ 
                        value: `Start: ${weightProgress.weightEntries[0].weight} lbs`, 
                        position: "topLeft",
                        offset: 10,
                        fontSize: 12,
                        fill: "#F59E0B",
                        fontWeight: "bold"
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weight Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Progress */}
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Current Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weightProgress.weightEntries.length > 0 && (
                    <div>
                      <span className="text-gray-400">Current Weight:</span>
                      <div className="text-2xl font-bold text-green-400">
                        {weightProgress.weightEntries[weightProgress.weightEntries.length - 1].weight} lbs
                      </div>
                    </div>
                  )}
                  
                  {weightProgress.goalWeight && weightProgress.weightEntries.length > 0 && (
                    <div>
                      <span className="text-gray-400">Progress to Goal:</span>
                      <div className="text-2xl font-bold text-blue-400">
                        {Math.abs(weightProgress.weightEntries[weightProgress.weightEntries.length - 1].weight - weightProgress.goalWeight).toFixed(1)} lbs
                        {weightProgress.goal === 'weight-loss' ? ' to lose' : ' to gain'}
                      </div>
                    </div>
                  )}
                  
                  {weightProgress.weightEntries.length > 1 && (
                    <div>
                      <span className="text-gray-400">Total Change:</span>
                      <div className={`text-2xl font-bold ${
                        (weightProgress.weightEntries[weightProgress.weightEntries.length - 1].weight - 
                         weightProgress.weightEntries[0].weight) > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {(weightProgress.weightEntries[weightProgress.weightEntries.length - 1].weight - 
                          weightProgress.weightEntries[0].weight) > 0 ? '+' : ''}
                        {(weightProgress.weightEntries[weightProgress.weightEntries.length - 1].weight - 
                          weightProgress.weightEntries[0].weight).toFixed(1)} lbs
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Goal Information */}
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Goal Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-400">Goal Type:</span>
                    <div className="text-lg font-semibold text-white capitalize">
                      {weightProgress.goal?.replace('-', ' ') || 'Not specified'}
                    </div>
                  </div>
                  
                  {weightProgress.goalWeight && (
                    <div>
                      <span className="text-gray-400">Target Weight:</span>
                      <div className="text-lg font-semibold text-blue-400">
                        {weightProgress.goalWeight} lbs
                      </div>
                    </div>
                  )}
                  
                  {weightProgress.goalWeight && weightProgress.currentWeight && (
                    <div>
                      <span className="text-gray-400">Progress:</span>
                      <div className="mt-2">
                        <div className="bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.abs(
                                (weightProgress.currentWeight - (weightProgress.weightEntries[0]?.weight || weightProgress.currentWeight)) /
                                (weightProgress.goalWeight - (weightProgress.weightEntries[0]?.weight || weightProgress.currentWeight))
                              ) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {Math.min(100, Math.abs(
                            (weightProgress.currentWeight - (weightProgress.weightEntries[0]?.weight || weightProgress.currentWeight)) /
                            (weightProgress.goalWeight - (weightProgress.weightEntries[0]?.weight || weightProgress.currentWeight))
                          ) * 100).toFixed(0)}% to goal
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Entries */}
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Recent Weigh-ins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weightProgress.weightEntries.slice(-5).reverse().map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{entry.weight} lbs</div>
                        <div className="text-gray-400 text-sm">
                          {new Date(entry.recordedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      {entry.notes && (
                        <div className="text-gray-300 text-sm max-w-24 truncate">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {weightProgress.weightEntries.length === 0 && (
                    <div className="text-gray-400 text-center py-4">
                      No weight entries recorded yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {processedData.length === 0 && viewType !== 'weight' && (
        <Card className="bg-surface border-gray-700">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">No data available for the selected time range.</p>
            <p className="text-gray-500 text-sm mt-2">Client hasn't uploaded any macro data yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}