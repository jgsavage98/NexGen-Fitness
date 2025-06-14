import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProgressEntry, MacroTarget, Meal } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Scale, TrendingDown, TrendingUp, RefreshCw } from "lucide-react";

export default function ProgressTab() {
  const [currentWeight, setCurrentWeight] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const { data: progressEntries = [], refetch: refetchProgress, isLoading: progressLoading } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress"],
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
      return await apiRequest("POST", "/api/progress", {
        weight: weight,
        notes: `Weight: ${weight} lbs`
      });
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

  // Seed test data mutation
  const seedDataMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await fetch("/api/test/seed-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ days })
      });
      
      if (!response.ok) {
        throw new Error("Failed to seed test data");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Data Generated",
        description: "Historical progress data has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-macros/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-logs"] });
      setIsSeeding(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSeeding(false);
    },
  });

  const handleSeedData = (days: number) => {
    setIsSeeding(true);
    seedDataMutation.mutate(days);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force invalidate all progress-related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      await refetchProgress();
      
      console.log('Refresh completed, new data:', progressEntries);
      
      toast({
        title: "Progress Updated",
        description: "Latest weight data has been refreshed.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to update progress data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
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

  // Get monthly data for report calculations (last 30 days)
  const { data: monthlyMacros = [] } = useQuery({
    queryKey: ["/api/daily-macros/recent", 30],
    queryFn: async () => {
      const response = await fetch("/api/daily-macros/recent?days=30");
      if (!response.ok) throw new Error("Failed to fetch monthly macros");
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

  // Calculate monthly stats for the Monthly Report
  const monthStart = new Date();
  monthStart.setDate(1); // First day of current month
  
  const monthlyWorkouts = workoutLogs.filter(log => 
    new Date(log.completedAt || '') >= monthStart
  );
  
  const monthlyMacroData = monthlyMacros.filter((macro: any) => 
    new Date(macro.date) >= monthStart
  );
  
  // Calculate monthly adherence and performance
  const monthlyMacroAdherence = monthlyMacroData.length > 0 
    ? Math.round(monthlyMacroData.reduce((acc: number, macro: any) => 
        acc + (macro.adherenceScore || 85), 0) / monthlyMacroData.length) // Default to 85 if no adherence score
    : 0;

  // Calculate workout consistency (assumes 5 workouts per week target)
  const daysInMonth = new Date().getDate(); // Days passed in current month
  const expectedWorkouts = Math.floor((daysInMonth / 7) * 5); // ~5 workouts per week
  const workoutConsistency = expectedWorkouts > 0 
    ? Math.min(100, Math.round((monthlyWorkouts.length / expectedWorkouts) * 100))
    : 0;

  // Debug logging
  console.log('Progress entries received:', progressEntries);
  
  // Get weight entries from progress data
  const weightEntries = (progressEntries as ProgressEntry[]).filter((entry: ProgressEntry) => entry.weight !== null);
  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const baselineWeight = (user as any)?.weight || null; // Use profile weight as baseline
  const goalWeight = (user as any)?.goalWeight || null;
  
  console.log('Latest weight:', latestWeight, 'from', weightEntries.length, 'entries');
  
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

  // Calculate goal progress
  const monthlyWeightProgress = weightProgress ? {
    changeFromBaseline: weightProgress.changeFromBaseline,
    remaining: weightProgress.remaining,
    progressPercentage: Math.abs(weightProgress.changeFromBaseline) / Math.abs(baselineWeight - goalWeight) * 100
  } : null;

  const weeklyStats = {
    workoutsCompleted: thisWeekWorkouts.length,
    workoutsPlanned: (user as any)?.weeklyWorkoutGoal || 5,
    avgMacroAdherence: macroAdherence,
  };

  // Calculate real achievements based on user data
  const calculateAchievements = () => {
    const achievements = [];
    
    // Weight Loss Achievement
    if (weightProgress && weightProgress.changeFromBaseline < -1) {
      achievements.push({
        id: 1,
        title: "Weight Loss Progress",
        description: `Lost ${Math.abs(weightProgress.changeFromBaseline).toFixed(1)} lbs from starting weight`,
        icon: "fas fa-weight",
        color: "bg-success",
        earned: true,
      });
    }
    
    // Consistency Achievement
    if (monthlyMacroData.length >= 7) {
      achievements.push({
        id: 2,
        title: "Tracking Champion",
        description: `Tracked nutrition for ${monthlyMacroData.length} days this month`,
        icon: "fas fa-chart-line",
        color: "bg-primary-500",
        earned: true,
      });
    }
    
    // Workout Consistency
    if (monthlyWorkouts.length >= 8) {
      achievements.push({
        id: 3,
        title: "Workout Warrior",
        description: `Completed ${monthlyWorkouts.length} workouts this month`,
        icon: "fas fa-dumbbell",
        color: "bg-warning",
        earned: true,
      });
    }
    
    // High Adherence Achievement
    if (monthlyMacroAdherence >= 80) {
      achievements.push({
        id: 4,
        title: "Macro Master",
        description: `Achieved ${monthlyMacroAdherence}% nutrition adherence`,
        icon: "fas fa-target",
        color: "bg-success",
        earned: true,
      });
    }
    
    // Goal Progress Achievement
    if (monthlyWeightProgress && monthlyWeightProgress.progressPercentage >= 20) {
      achievements.push({
        id: 5,
        title: "Goal Crusher",
        description: `${Math.round(monthlyWeightProgress.progressPercentage)}% progress toward goal weight`,
        icon: "fas fa-trophy",
        color: "bg-success",
        earned: true,
      });
    }
    
    // Program Commitment (if they've been active for more than a week)
    const daysSinceStart = Math.floor((new Date().getTime() - new Date((user as any)?.programStartDate || new Date()).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceStart >= 7) {
      achievements.push({
        id: 6,
        title: "Program Commitment", 
        description: `Active for ${daysSinceStart} days in the program`,
        icon: "fas fa-calendar-check",
        color: "bg-primary-500",
        earned: true,
      });
    }
    
    return achievements;
  };

  const achievements = calculateAchievements();

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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Refresh button clicked!');
                  handleRefresh();
                }}
                disabled={isRefreshing}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
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
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Current Weight */}
            <div className="bg-dark rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {progressLoading ? (
                  <div className="animate-pulse">Loading...</div>
                ) : latestWeight ? (
                  `${latestWeight} lbs`
                ) : (
                  "—"
                )}
              </div>
              <div className="text-sm text-gray-400">
                Current Weight
                {progressEntries.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {progressEntries.length} entries
                  </div>
                )}
              </div>
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
                <div className="text-sm text-gray-400">
                  {monthlyWorkouts.length} of {expectedWorkouts} expected workouts
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  workoutConsistency >= 90 ? 'text-success' : 
                  workoutConsistency >= 75 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {workoutConsistency >= 90 ? 'A' : 
                   workoutConsistency >= 80 ? 'A-' :
                   workoutConsistency >= 75 ? 'B+' :
                   workoutConsistency >= 70 ? 'B' :
                   workoutConsistency >= 65 ? 'B-' :
                   workoutConsistency >= 60 ? 'C+' : 'C'}
                </div>
                <div className="text-xs text-gray-400">{workoutConsistency}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <div className="font-medium text-white">Nutrition Adherence</div>
                <div className="text-sm text-gray-400">
                  {monthlyMacroData.length > 0 
                    ? `${monthlyMacroData.length} days tracked this month`
                    : 'No macro data available'
                  }
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  monthlyMacroAdherence >= 85 ? 'text-success' : 
                  monthlyMacroAdherence >= 70 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {monthlyMacroAdherence >= 90 ? 'A+' :
                   monthlyMacroAdherence >= 85 ? 'A' :
                   monthlyMacroAdherence >= 80 ? 'A-' :
                   monthlyMacroAdherence >= 75 ? 'B+' :
                   monthlyMacroAdherence >= 70 ? 'B' :
                   monthlyMacroAdherence >= 65 ? 'B-' : 'C'}
                </div>
                <div className="text-xs text-gray-400">{monthlyMacroAdherence}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-white">Goal Progress</div>
                <div className="text-sm text-gray-400">
                  {(user as any)?.goal === 'weight-loss' ? 'Weight loss target' : 
                   (user as any)?.goal === 'muscle-gain' ? 'Muscle gain target' : 'Fitness goal'}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  monthlyWeightProgress && monthlyWeightProgress.progressPercentage >= 25 ? 'text-success' : 
                  monthlyWeightProgress && monthlyWeightProgress.progressPercentage >= 10 ? 'text-yellow-400' : 'text-primary-500'
                }`}>
                  {monthlyWeightProgress && monthlyWeightProgress.progressPercentage >= 40 ? 'A' :
                   monthlyWeightProgress && monthlyWeightProgress.progressPercentage >= 25 ? 'B+' :
                   monthlyWeightProgress && monthlyWeightProgress.progressPercentage >= 10 ? 'B' :
                   monthlyWeightProgress ? 'B-' : 'In Progress'}
                </div>
                <div className="text-xs text-gray-400">
                  {monthlyWeightProgress ? 
                    `${monthlyWeightProgress.changeFromBaseline > 0 ? '+' : ''}${monthlyWeightProgress.changeFromBaseline.toFixed(1)} lbs` :
                    'Track progress'
                  }
                </div>
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
