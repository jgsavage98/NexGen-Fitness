import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MacroBars from "./MacroBars";
import MacroVisualizationOptions from "./MacroVisualizationOptions";
import AnimatedExerciseThumbnail from "./AnimatedExerciseThumbnail";
import { Workout, MacroTarget } from "@/lib/types";
import { Link } from "wouter";
import { User, Calendar, Target } from "lucide-react";
import { getTodayInTimezone } from "@/lib/dateUtils";
import { TabType } from "@/pages/Home";

interface DashboardTabProps {
  onTabChange?: (tab: TabType) => void;
}

export default function DashboardTab({ onTabChange }: DashboardTabProps) {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Use user's timezone for all date calculations
  const userTimezone = (user as any)?.timezone || 'America/New_York';
  const today = getTodayInTimezone(userTimezone);

  const { data: workout } = useQuery<Workout>({
    queryKey: ["/api/workout/today"],
  });

  const { data: macroTargets } = useQuery<MacroTarget | any>({
    queryKey: [`/api/macro-targets?date=${today}`],
  });

  const { data: dailyMacros } = useQuery({
    queryKey: [`/api/daily-macros?date=${today}`],
    retry: false,
  });

  // Only show extracted macros if screenshot was uploaded today and processed
  const hasUploadedToday = dailyMacros && 
    (dailyMacros as any).screenshotUrl && 
    (dailyMacros as any).visionProcessedAt &&
    (dailyMacros as any).date === today;
    
  console.log('Dashboard check:', { dailyMacros, hasUploadedToday, today, userTimezone });
  
  const consumedMacros = hasUploadedToday ? {
    calories: (dailyMacros as any).extractedCalories || 0,
    protein: (dailyMacros as any).extractedProtein || 0,
    carbs: (dailyMacros as any).extractedCarbs || 0,
    fat: (dailyMacros as any).extractedFat || 0,
  } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Check if macro targets are pending trainer approval
  const isPendingApproval = macroTargets?.status === 'pending_trainer_approval';
  const isOnboardingIncomplete = macroTargets?.status === 'onboarding_incomplete';
  const hasNoTargets = macroTargets?.status === 'no_targets';

  const macroSummary = {
    consumed: consumedMacros,
    targets: (macroTargets && !isPendingApproval && !isOnboardingIncomplete && !hasNoTargets) ? {
      calories: macroTargets.calories,
      protein: macroTargets.protein,
      carbs: macroTargets.carbs,
      fat: macroTargets.fat,
    } : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    percentages: {
      calories: (macroTargets && !isPendingApproval && !isOnboardingIncomplete && !hasNoTargets) ? (consumedMacros.calories / macroTargets.calories) * 100 : 0,
      protein: (macroTargets && !isPendingApproval && !isOnboardingIncomplete && !hasNoTargets) ? (consumedMacros.protein / macroTargets.protein) * 100 : 0,
      carbs: (macroTargets && !isPendingApproval && !isOnboardingIncomplete && !hasNoTargets) ? (consumedMacros.carbs / macroTargets.carbs) * 100 : 0,
      fat: (macroTargets && !isPendingApproval && !isOnboardingIncomplete && !hasNoTargets) ? (consumedMacros.fat / macroTargets.fat) * 100 : 0,
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
                {isPendingApproval 
                  ? "I'm currently reviewing your information and creating your personalized macro plan. You'll receive notification once it's ready!"
                  : "Ready for another great day! Upload your MyFitnessPal screenshot so I can track your progress and provide personalized guidance."
                }
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

      {/* Pending Approval Notification */}
      {isPendingApproval && (
        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-yellow-400 font-semibold mb-1">Macro Plan Under Review</h3>
                <p className="text-gray-300 text-sm">
                  {macroTargets.message}
                </p>
                {macroTargets.pendingMacros && (
                  <div className="mt-2 text-xs text-gray-400">
                    Proposed: {macroTargets.pendingMacros.calories} cal, {macroTargets.pendingMacros.protein}g protein
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Overview Card */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 text-white">Today's Overview</h2>
          
          {/* Macro Progress Bars */}
          <MacroBars summary={macroSummary} />

          <div className="bg-dark rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300">Total Calories</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${
                  macroSummary.percentages.calories > 100 ? 'text-red-400' : 
                  macroSummary.percentages.calories >= 90 ? 'text-green-400' :
                  macroSummary.percentages.calories >= 70 ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {Math.round(macroSummary.percentages.calories)}%
                </span>
                <span className="text-xs text-gray-400">
                  {Math.round(consumedMacros.calories)} / {macroSummary.targets.calories}
                </span>
              </div>
            </div>
            
            <div className="relative w-full bg-gray-700 rounded-full h-3">
              {/* 100% baseline marker */}
              <div className="absolute left-0 top-0 w-full h-full border-r-2 border-gray-500 rounded-full"></div>
              
              {/* Progress bar */}
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  macroSummary.percentages.calories > 100 ? 'bg-red-500' :
                  macroSummary.percentages.calories >= 90 ? 'bg-green-500' :
                  macroSummary.percentages.calories >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ 
                  width: `${Math.min(100, macroSummary.percentages.calories)}%`,
                  ...(macroSummary.percentages.calories > 100 && {
                    background: 'linear-gradient(90deg, #3b82f6 0%, #ef4444 100%)',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
                  })
                }}
              />
              
              {/* Overflow indicator for values over 100% */}
              {macroSummary.percentages.calories > 100 && (
                <div 
                  className="absolute top-0 h-full bg-red-500 opacity-60 rounded-r-full"
                  style={{ 
                    left: '100%',
                    width: `${Math.min(50, (macroSummary.percentages.calories - 100) * 0.5)}%`,
                  }}
                />
              )}
              
              {/* 100% marker line */}
              <div className="absolute right-0 top-0 w-0.5 h-full bg-gray-400 opacity-50"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => onTabChange?.('nutrition')}
          disabled={hasUploadedToday || isPendingApproval}
          className={`p-4 h-auto text-left flex flex-col items-start space-y-2 w-full ${
            (hasUploadedToday || isPendingApproval)
              ? "bg-gray-600 hover:bg-gray-600 border-gray-600 cursor-not-allowed" 
              : "bg-primary-500 hover:bg-primary-600 border-primary-500"
          }`}
        >
          <i className={`fas fa-camera text-xl ${(hasUploadedToday || isPendingApproval) ? "text-gray-400" : "text-white"}`}></i>
          <div>
            <div className={`font-semibold ${(hasUploadedToday || isPendingApproval) ? "text-gray-400" : "text-white"}`}>
              {hasUploadedToday ? "Today's Upload Complete" : 
               isPendingApproval ? "Upload Disabled" : "Upload Screenshot"}
            </div>
            <div className={`text-xs leading-tight ${(hasUploadedToday || isPendingApproval) ? "text-gray-500" : "text-primary-100"}`}>
              {hasUploadedToday ? "Check back tomorrow" : 
               isPendingApproval ? "Awaiting plan approval" : "Today's MyFitnessPal"}
            </div>
          </div>
        </Button>
        
        <Button 
          disabled={isPendingApproval}
          className={`p-4 h-auto text-left flex flex-col items-start space-y-2 w-full ${
            isPendingApproval 
              ? "bg-gray-600 hover:bg-gray-600 border-gray-600 cursor-not-allowed" 
              : "bg-surface hover:bg-gray-700 border-gray-700"
          }`}
          onClick={() => !isPendingApproval && onTabChange?.('workout')}
        >
          <i className={`fas fa-play text-xl ${isPendingApproval ? "text-gray-400" : "text-success"}`}></i>
          <div>
            <div className={`font-semibold ${isPendingApproval ? "text-gray-400" : "text-white"}`}>
              {isPendingApproval ? "Workout Disabled" : "Start Workout"}
            </div>
            <div className={`text-sm ${isPendingApproval ? "text-gray-500" : "text-gray-400"}`}>
              {isPendingApproval ? "Awaiting plan approval" : "Begin today's plan"}
            </div>
          </div>
        </Button>
      </div>

      {/* Today's Workout Preview - Only show when plan is approved */}
      {!isPendingApproval && !isOnboardingIncomplete && !hasNoTargets && (
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
                  <div key={index} className="flex items-center space-x-3 p-3 bg-dark rounded-lg hover:bg-gray-800 transition-colors">
                    <AnimatedExerciseThumbnail exerciseName={exercise.name} />
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
      )}


    </div>
  );
}
