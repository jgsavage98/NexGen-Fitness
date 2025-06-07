import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Weight } from "lucide-react";

interface WeightProgressProps {
  exerciseName: string;
  className?: string;
}

export default function WeightProgressChart({ exerciseName, className }: WeightProgressProps) {
  const { data: workoutLogs, isLoading } = useQuery({
    queryKey: ['/api/workout-logs', exerciseName],
    queryFn: async () => {
      const response = await fetch(`/api/workout-logs?exercise=${encodeURIComponent(exerciseName)}`);
      if (!response.ok) throw new Error('Failed to fetch workout logs');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card className={`bg-gray-800 border-gray-700 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Weight Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading progress...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workoutLogs || workoutLogs.length === 0) {
    return (
      <Card className={`bg-gray-800 border-gray-700 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Weight Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            Complete your first set to see progress
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process data for chart
  const progressData = workoutLogs
    .filter((log: any) => log.weight && log.weight > 0)
    .map((log: any) => ({
      date: new Date(log.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: log.weight,
      reps: log.reps,
      fullDate: new Date(log.completedAt)
    }))
    .sort((a: any, b: any) => a.fullDate.getTime() - b.fullDate.getTime())
    .slice(-10); // Show last 10 workouts

  const latestWeight = progressData[progressData.length - 1]?.weight || 0;
  const firstWeight = progressData[0]?.weight || 0;
  const improvement = latestWeight - firstWeight;

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Weight Progress
          </CardTitle>
          {improvement > 0 && (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <TrendingUp className="h-3 w-3" />
              +{improvement}lbs
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={10}
                tickLine={false}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={10}
                tickLine={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB'
                }}
                formatter={(value: any, name: string) => [
                  `${value}${name === 'weight' ? 'lbs' : ' reps'}`,
                  name === 'weight' ? 'Weight' : 'Reps'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 4, stroke: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {progressData.length} workouts
          </div>
          <div className="flex items-center gap-1">
            <Weight className="h-3 w-3" />
            Current: {latestWeight}lbs
          </div>
        </div>
      </CardContent>
    </Card>
  );
}