import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProgressEntry, MacroTarget, Meal } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";

export default function ProgressTab() {
  const [currentWeight, setCurrentWeight] = useState("");
  const { toast } = useToast();

  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress"],
  });

  const { data: workoutLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/workout-logs"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Log weight mutation
  const logWeightMutation = useMutation({
    mutationFn: async (weight: number) => {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight: weight,
          notes: `Weight: ${weight} lbs`
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to log weight");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Weight Logged!",
        description: "Your weight has been recorded successfully.",
      });
      setCurrentWeight("");
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWeightSubmit = () => {
    const weight = parseFloat(currentWeight);
    if (!weight || weight <= 0) {
      toast({
        title: "Invalid Weight",
        description: "Please enter a valid weight in pounds.",
        variant: "destructive",
      });
      return;
    }
    logWeightMutation.mutate(weight);
  };

  // Calculate this week's stats
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  
  const thisWeekWorkouts = workoutLogs.filter(log => 
    new Date(log.completedAt || '') >= thisWeekStart
  );

  // Get recent macro data for adherence calculation
  const { data: recentMacros = [] } = useQuery({
    queryKey: ["/api/daily-macros/recent", 7],
    queryFn: async () => {
      const response = await fetch("/api/daily-macros/recent?days=7");
      if (!response.ok) throw new Error("Failed to fetch recent macros");
      return response.json();
    }
  });

  // Calculate actual macro adherence for this week
  const thisWeekMacros = recentMacros.filter((macro: any) => 
    new Date(macro.date) >= thisWeekStart
  );
  
  const macroAdherence = thisWeekMacros.length > 0 
    ? Math.round(thisWeekMacros.reduce((acc: number, macro: any) => 
        acc + (macro.adherenceScore || 0), 0) / thisWeekMacros.length)
    : 0;

  const weeklyStats = {
    workoutsCompleted: thisWeekWorkouts.length,
    workoutsPlanned: (user as any)?.weeklyWorkoutGoal || 5,
    avgMacroAdherence: macroAdherence,
  };

  // Get weight entries from progress data
  const weightEntries = progressEntries.filter(entry => entry.weight !== null);
  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const baselineWeight = (user as any)?.weight || null; // Use profile weight as baseline
  const goalWeight = (user as any)?.goalWeight || null;
  
  // Calculate weight progress
  const weightProgress = latestWeight && goalWeight && baselineWeight ? {
    current: latestWeight,
    goal: goalWeight,
    baseline: baselineWeight,
    changeFromBaseline: latestWeight - baselineWeight,
    remaining: Math.abs(latestWeight - goalWeight),
    trend: weightEntries.length >= 2 ? 
      weightEntries[weightEntries.length - 1].weight! - weightEntries[weightEntries.length - 2].weight! : 0
  } : null;

  const achievements = [
    {
      id: 1,
      title: "First 5-day streak!",
      description: "Completed workouts 5 days in a row",
      icon: "fas fa-trophy",
      color: "bg-warning",
      earned: true,
    },
    {
      id: 2,
      title: "Macro Master",
      description: "Hit all macro targets for 3 consecutive days",
      icon: "fas fa-target",
      color: "bg-success",
      earned: true,
    },
    {
      id: 3,
      title: "Strength Gains",
      description: "Increased bench press by 10lbs",
      icon: "fas fa-dumbbell",
      color: "bg-primary-500",
      earned: false,
    },
  ];

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Weight Tracking */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Scale className="w-5 h-5 mr-2 text-primary-500" />
              Weight Progress
            </h2>
            {weightProgress && (
              <div className="flex items-center text-sm">
                {weightProgress.trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-400 mr-1" />
                ) : weightProgress.trend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-400 mr-1" />
                ) : null}
                <span className={weightProgress.trend > 0 ? "text-red-400" : weightProgress.trend < 0 ? "text-green-400" : "text-gray-400"}>
                  {weightProgress.trend > 0 ? "+" : ""}{weightProgress.trend.toFixed(1)} lbs
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Current Weight */}
            <div className="bg-dark rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {latestWeight ? `${latestWeight} lbs` : "—"}
              </div>
              <div className="text-sm text-gray-400">Current Weight</div>
            </div>

            {/* Change from Baseline */}
            <div className="bg-dark rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold mb-1 ${
                weightProgress && weightProgress.changeFromBaseline !== 0
                  ? weightProgress.changeFromBaseline > 0 
                    ? "text-red-400" 
                    : "text-green-400"
                  : "text-gray-400"
              }`}>
                {weightProgress && baselineWeight ? 
                  `${weightProgress.changeFromBaseline > 0 ? '+' : ''}${weightProgress.changeFromBaseline.toFixed(1)} lbs` 
                  : "—"}
              </div>
              <div className="text-sm text-gray-400">vs. Starting Weight</div>
            </div>

            {/* Goal Weight */}
            <div className="bg-dark rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-500 mb-1">
                {goalWeight ? `${goalWeight} lbs` : "—"}
              </div>
              <div className="text-sm text-gray-400">Goal Weight</div>
            </div>

            {/* Remaining */}
            <div className="bg-dark rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-success mb-1">
                {weightProgress ? `${weightProgress.remaining.toFixed(1)} lbs` : "—"}
              </div>
              <div className="text-sm text-gray-400">To Goal</div>
            </div>
          </div>

          {/* Baseline Reference */}
          {baselineWeight && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">Starting Weight (From Setup)</div>
              <div className="text-lg font-semibold text-gray-300">{baselineWeight} lbs</div>
              <div className="text-xs text-gray-500 mt-1">
                Entered during onboarding
              </div>
            </div>
          )}

          {/* Weight Entry Form */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="weight" className="text-gray-300 text-sm">Log Today's Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="Enter weight..."
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-1"
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button
                onClick={handleWeightSubmit}
                disabled={!currentWeight || logWeightMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {logWeightMutation.isPending ? "Logging..." : "Log Weight"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Overview */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 text-white">This Week's Progress</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-dark rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-success mb-1">
                {weeklyStats.workoutsCompleted}
              </div>
              <div className="text-sm text-gray-400">Workouts</div>
              <div className="text-xs text-gray-500">
                of {weeklyStats.workoutsPlanned} planned
              </div>
            </div>
            
            <div className="bg-dark rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-500 mb-1">
                {weeklyStats.avgMacroAdherence}%
              </div>
              <div className="text-sm text-gray-400">Macro Target</div>
              <div className="text-xs text-gray-500">average hit rate</div>
            </div>
          </div>

          {/* Weight Progress Chart */}
          <div className="mb-4">
            <h3 className="font-semibold mb-3 text-white">
              Weight Trend 
              {weightEntries.length > 0 && (
                <span className="text-sm font-normal text-gray-400">
                  ({weightEntries.length} {weightEntries.length === 1 ? 'entry' : 'entries'})
                </span>
              )}
            </h3>
            <div className="relative h-32 bg-dark rounded-lg p-4">
              {weightEntries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Log your first weight to see progress
                </div>
              ) : weightEntries.length === 1 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-500 mb-1">
                      {weightEntries[0].weight} lbs
                    </div>
                    <div className="text-sm text-gray-400">First Entry</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Log more weights to see trends
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <svg className="w-full h-full" viewBox="0 0 300 100">
                    <defs>
                      <linearGradient id="weightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0F63FF" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#0F63FF" stopOpacity="0.2"/>
                      </linearGradient>
                    </defs>
                    
                    {(() => {
                      // Calculate chart points from actual weight data
                      const chartData = weightEntries.map((entry, index) => ({
                        weight: entry.weight!,
                        x: (index / Math.max(weightEntries.length - 1, 1)) * 280 + 10,
                        date: new Date(entry.recordedAt).toLocaleDateString()
                      }));
                      
                      // Normalize weights to chart height (20-80 range)
                      const weights = chartData.map(d => d.weight);
                      const minWeight = Math.min(...weights);
                      const maxWeight = Math.max(...weights);
                      const weightRange = maxWeight - minWeight || 1;
                      
                      const points = chartData.map(d => ({
                        ...d,
                        y: 80 - ((d.weight - minWeight) / weightRange) * 60
                      }));
                      
                      const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
                      
                      return (
                        <>
                          {/* Trend line */}
                          <polyline
                            points={polylinePoints}
                            fill="none"
                            stroke="#0F63FF"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          
                          {/* Data points */}
                          {points.map((point, index) => (
                            <circle
                              key={index}
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="#0F63FF"
                            />
                          ))}
                          
                          {/* Gradient fill under line */}
                          <polygon
                            points={`${polylinePoints} ${points[points.length - 1].x},100 ${points[0].x},100`}
                            fill="url(#weightGradient)"
                          />
                        </>
                      );
                    })()}
                  </svg>
                  
                  <div className="absolute bottom-2 left-4 text-xs text-gray-400">
                    {weightEntries[0].weight} lbs → {latestWeight} lbs 
                    ({weightProgress && weightProgress.changeFromBaseline !== 0 
                      ? `${weightProgress.changeFromBaseline > 0 ? '+' : ''}${weightProgress.changeFromBaseline.toFixed(1)} lbs`
                      : 'No change'})
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Report Card */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Monthly Report</h3>
            <span className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <div className="font-medium text-white">Workout Consistency</div>
                <div className="text-sm text-gray-400">16 of 20 workouts completed</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-success">A</div>
                <div className="text-xs text-gray-400">80%</div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <div className="font-medium text-white">Nutrition Adherence</div>
                <div className="text-sm text-gray-400">Average macro target hit</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-success">A-</div>
                <div className="text-xs text-gray-400">85%</div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-white">Goal Progress</div>
                <div className="text-sm text-gray-400">Weight loss target</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary-500">B+</div>
                <div className="text-xs text-gray-400">-2.3kg</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Recent Achievements</h3>
          
          <div className="space-y-3">
            {achievements.filter(a => a.earned).map((achievement) => (
              <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-dark rounded-lg">
                <div className={`w-12 h-12 ${achievement.color} rounded-full flex items-center justify-center`}>
                  <i className={`${achievement.icon} text-white`}></i>
                </div>
                <div>
                  <div className="font-medium text-white">{achievement.title}</div>
                  <div className="text-sm text-gray-400">{achievement.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coach Notes */}
      <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <img 
            src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
            alt="Coach Chassidy"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
          />
          <div className="text-sm">
            <p className="font-semibold text-primary-300 mb-1">Message from Coach Chassidy:</p>
            <p className="text-primary-100 mb-3">
              Excellent progress this month! Your consistency with workouts is paying off. 
              Consider increasing your protein intake by 10g to support your strength gains. 
              Keep up the great work!
            </p>
            <button className="text-primary-300 text-sm underline hover:text-primary-200">
              Discuss with AI Coach →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
