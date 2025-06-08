import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MacroRings from "./MacroRings";
import { Workout, MacroTarget } from "@/lib/types";
import { Link } from "wouter";
import { User, Calendar, Target } from "lucide-react";

export default function DashboardTab() {
  const today = new Date().toISOString().split('T')[0];

  const { data: workout } = useQuery<Workout>({
    queryKey: ["/api/workout/today"],
  });

  const { data: macroTargets } = useQuery<MacroTarget>({
    queryKey: [`/api/macro-targets?date=${today}`],
  });

  const { data: dailyMacros } = useQuery({
    queryKey: [`/api/daily-macros?date=${today}`],
    retry: false,
  });

  // Only show extracted macros if screenshot was uploaded today
  const hasUploadedToday = dailyMacros && (dailyMacros as any).screenshotUrl && (dailyMacros as any).visionProcessedAt;
  const consumedMacros = hasUploadedToday ? {
    calories: (dailyMacros as any).extractedCalories || 0,
    protein: (dailyMacros as any).extractedProtein || 0,
    carbs: (dailyMacros as any).extractedCarbs || 0,
    fat: (dailyMacros as any).extractedFat || 0,
  } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const macroSummary = {
    consumed: consumedMacros,
    targets: macroTargets ? {
      calories: macroTargets.calories,
      protein: macroTargets.protein,
      carbs: macroTargets.carbs,
      fat: macroTargets.fat,
    } : { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    percentages: {
      calories: macroTargets ? (consumedMacros.calories / macroTargets.calories) * 100 : 0,
      protein: macroTargets ? (consumedMacros.protein / macroTargets.protein) * 100 : 0,
      carbs: macroTargets ? (consumedMacros.carbs / macroTargets.carbs) * 100 : 0,
      fat: macroTargets ? (consumedMacros.fat / macroTargets.fat) * 100 : 0,
    }
  };

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Coach Welcome Card */}
      <Card className="bg-gradient-to-r from-gray-800 to-gray-900 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <img 
              src="/coach-chassidy.jpg" 
              alt="Coach Chassidy"
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
            />
            <div className="flex-1">
              <p className="text-white font-medium mb-1">Coach Chassidy</p>
              <p className="text-gray-300 text-sm">
                Ready for another great day! Upload your MyFitnessPal screenshot so I can track your progress and provide personalized guidance.
              </p>
            </div>
            <Link href="/coach">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                <User className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Daily Overview Card */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 text-white">Today's Overview</h2>
          
          {/* Macro Progress Rings */}
          <MacroRings summary={macroSummary} />

          <div className="bg-dark rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Total Calories</span>
              <span className="text-sm font-semibold text-white">
                {Math.round(consumedMacros.calories)}
              </span>
              <span className="text-sm text-gray-400">
                / {macroSummary.targets.calories}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, macroSummary.percentages.calories)}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/screenshot-upload">
          <Button className="bg-primary-500 hover:bg-primary-600 border-primary-500 p-4 h-auto text-left flex flex-col items-start space-y-2 w-full">
            <i className="fas fa-camera text-white text-xl"></i>
            <div>
              <div className="font-semibold text-white">Upload Screenshot</div>
              <div className="text-sm text-primary-100">MyFitnessPal daily totals</div>
            </div>
          </Button>
        </Link>
        
        <Link href="/workout">
          <Button className="bg-surface hover:bg-gray-700 border-gray-700 p-4 h-auto text-left flex flex-col items-start space-y-2 w-full">
            <i className="fas fa-play text-success text-xl"></i>
            <div>
              <div className="font-semibold text-white">Start Workout</div>
              <div className="text-sm text-gray-400">Begin today's plan</div>
            </div>
          </Button>
        </Link>
      </div>

      {/* Today's Workout Preview */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Today's Workout</h3>
            <span className="text-sm text-gray-400">
              {workout?.name || 'No workout planned'}
            </span>
          </div>
          
          {workout ? (
            <div className="space-y-3">
              {workout.exercises.slice(0, 3).map((exercise, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-dark rounded-lg">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                    <i className="fas fa-dumbbell text-primary-500"></i>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{exercise.name}</div>
                    <div className="text-sm text-gray-400">
                      {exercise.sets} sets × {exercise.reps} reps
                    </div>
                  </div>
                </div>
              ))}

              <Button className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-full font-semibold">
                View Full Workout
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-dumbbell text-gray-600 text-3xl mb-4"></i>
              <p className="text-gray-400 mb-4">No workout scheduled for today</p>
              <Button className="bg-primary-500 hover:bg-primary-600 text-white">
                Generate Workout
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Coach Insight */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-medium p-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fas fa-robot text-white"></i>
          </div>
          <div>
            <div className="font-semibold text-white mb-1">Coach AI Insight</div>
            <p className="text-white/90 text-sm">
              {macroSummary.percentages.protein > 80 
                ? "Great job hitting your protein target! Try adding some healthy carbs before your next workout for better performance."
                : "Consider adding more protein to your meals today. Aim for 20-30g per meal to support your goals."
              }
            </p>
            <button className="text-white/80 text-sm mt-2 underline">
              Ask a question →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
