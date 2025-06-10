import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';
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
  const [viewType, setViewType] = useState<'macros' | 'wellness' | 'adherence'>('macros');

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
                  <Line type="monotone" dataKey="calories" stroke="#3B82F6" strokeWidth={2} name="Calories" />
                  <Line type="monotone" dataKey="targetCalories" stroke="#3B82F6" strokeDasharray="5 5" name="Target Calories" />
                  <Line type="monotone" dataKey="protein" stroke="#10B981" strokeWidth={2} name="Protein" />
                  <Line type="monotone" dataKey="targetProtein" stroke="#10B981" strokeDasharray="5 5" name="Target Protein" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hunger and Energy Levels */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Daily Wellness Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#9CA3AF" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="hungerLevel" stroke="#EF4444" strokeWidth={3} name="Hunger Level" />
                  <Line type="monotone" dataKey="energyLevel" stroke="#F59E0B" strokeWidth={3} name="Energy Level" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Wellness Distribution */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Wellness Levels Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#9CA3AF" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hungerLevel" fill="#EF4444" name="Hunger Level" />
                  <Bar dataKey="energyLevel" fill="#F59E0B" name="Energy Level" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
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

      {processedData.length === 0 && (
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