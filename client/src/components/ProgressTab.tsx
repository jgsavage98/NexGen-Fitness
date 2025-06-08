import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressEntry, MacroTarget, Meal } from "@/lib/types";

export default function ProgressTab() {
  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress"],
  });

  const { data: workoutLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/workout-logs"],
  });

  // Calculate this week's stats
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  
  const thisWeekWorkouts = workoutLogs.filter(log => 
    new Date(log.completedAt || '') >= thisWeekStart
  );

  const weeklyStats = {
    workoutsCompleted: thisWeekWorkouts.length,
    workoutsPlanned: 5, // This would come from user's plan
    avgMacroAdherence: 87, // This would be calculated from actual data
  };

  // Mock weight progress data - in real app this would come from progressEntries
  const weightData = [
    { date: "Week 1", weight: 72.5 },
    { date: "Week 2", weight: 72.0 },
    { date: "Week 3", weight: 71.5 },
    { date: "Week 4", weight: 70.2 },
  ];

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
            <h3 className="font-semibold mb-3 text-white">Weight Trend (4 weeks)</h3>
            <div className="relative h-32 bg-dark rounded-lg p-4">
              <svg className="w-full h-full" viewBox="0 0 300 100">
                <defs>
                  <linearGradient id="weightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0F63FF" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#0F63FF" stopOpacity="0.2"/>
                  </linearGradient>
                </defs>
                
                {/* Weight trend line */}
                <polyline
                  points="0,80 100,75 200,70 300,65"
                  fill="none"
                  stroke="#0F63FF"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                
                {/* Data points */}
                {[0, 100, 200, 300].map((x, index) => (
                  <circle
                    key={index}
                    cx={x}
                    cy={80 - (index * 5)}
                    r="4"
                    fill="#0F63FF"
                  />
                ))}
                
                {/* Gradient fill under line */}
                <polygon
                  points="0,80 100,75 200,70 300,65 300,100 0,100"
                  fill="url(#weightGradient)"
                />
              </svg>
              
              <div className="absolute bottom-2 left-4 text-xs text-gray-400">
                72.5 kg → 70.2 kg (-2.3 kg)
              </div>
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
            src="/attached_assets/CE Bio Image_1749399911915.jpeg" 
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
