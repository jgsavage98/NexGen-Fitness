import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import ExerciseCard from "./ExerciseCard";
import { Workout, WorkoutSet, Exercise } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { Play, Clock, Target, TrendingUp, CheckCircle2, Timer } from "lucide-react";

export default function WorkoutTab() {
  const [workoutSets, setWorkoutSets] = useState<Record<string, WorkoutSet[]>>({});
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const queryClient = useQueryClient();

  const { data: workout, isLoading } = useQuery<Workout>({
    queryKey: ["/api/workout/today"],
  });

  const { data: exercises, isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const logExerciseMutation = useMutation({
    mutationFn: async (data: { exerciseId: number; sets: number; reps: number; weight?: number }) => {
      const response = await apiRequest("POST", "/api/workout/log-exercise", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout/today"] });
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutActive && workoutStartTime) {
      interval = setInterval(() => {
        setWorkoutTimer(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive, workoutStartTime]);

  const startWorkout = () => {
    setWorkoutStartTime(new Date());
    setIsWorkoutActive(true);
  };

  const pauseWorkout = () => {
    setIsWorkoutActive(false);
  };

  const endWorkout = () => {
    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setWorkoutTimer(0);
    // Mark workout as completed
    // TODO: Add workout completion API call
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getExerciseDetails = (exerciseName: string): Exercise | null => {
    return exercises?.find(ex => ex.name === exerciseName) || null;
  };

  const handleCompleteSet = (exerciseName: string, setNumber: number, reps: number, weight?: number) => {
    const exerciseKey = exerciseName;
    const currentSets = workoutSets[exerciseKey] || [];
    const exerciseDetails = getExerciseDetails(exerciseName);
    
    const newSet: WorkoutSet = {
      exerciseId: exerciseDetails?.id || 0,
      setNumber,
      reps,
      weight,
      completed: true,
    };
    
    const updatedSets = [...currentSets];
    updatedSets[setNumber - 1] = newSet;
    
    setWorkoutSets({
      ...workoutSets,
      [exerciseKey]: updatedSets,
    });

    // Log to database with proper exercise ID
    if (exerciseDetails?.id) {
      logExerciseMutation.mutate({
        exerciseId: exerciseDetails.id,
        sets: 1,
        reps,
        weight,
      });
    }
  };

  const getSetStatus = (exerciseName: string, setNumber: number) => {
    const exerciseSets = workoutSets[exerciseName] || [];
    return exerciseSets[setNumber - 1]?.completed || false;
  };

  const getWorkoutProgress = () => {
    if (!workout) return 0;
    const totalExercises = workout.exercises.length;
    const completedExercises = Object.keys(workoutSets).filter(exerciseName => {
      const exerciseSets = workoutSets[exerciseName] || [];
      const totalSets = workout.exercises.find(ex => ex.name === exerciseName)?.sets || 0;
      const completedSets = exerciseSets.filter(set => set.completed).length;
      return completedSets >= totalSets;
    }).length;
    
    return totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
  };

  if (isLoading || exercisesLoading) {
    return (
      <div className="px-6 py-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">
          <Target className="mx-auto text-gray-600 text-6xl mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Workout Planned</h2>
          <p className="text-gray-400 mb-6">Let's generate a personalized workout for you!</p>
          <Button className="bg-primary-500 hover:bg-primary-600 text-white">
            Generate Workout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Enhanced Workout Header */}
      <Card className="bg-surface border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-white text-xl mb-2">{workout.name}</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{workout.estimatedDuration || 45} min</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="w-4 h-4" />
                  <span>{workout.exercises.length} exercises</span>
                </div>
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  {workout.difficulty || 'Intermediate'}
                </Badge>
              </div>
            </div>
            
            {!isWorkoutActive ? (
              <Button 
                onClick={startWorkout}
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-full font-semibold"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Workout
              </Button>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-green-600/20 px-4 py-2 rounded-full">
                  <Timer className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-mono text-lg">{formatTimer(workoutTimer)}</span>
                </div>
                <Button 
                  onClick={pauseWorkout}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  Pause
                </Button>
                <Button 
                  onClick={endWorkout}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  End
                </Button>
              </div>
            )}
          </div>
          
          {/* Workout Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Workout Progress</span>
              <span className="text-sm text-gray-400">{Math.round(getWorkoutProgress())}%</span>
            </div>
            <Progress 
              value={getWorkoutProgress()} 
              className="h-2 bg-gray-700"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Target Muscle Groups */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Target Areas
          </h3>
          <div className="flex flex-wrap gap-2">
            {workout.targetMuscleGroups.map((muscle, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="border-primary-500/30 text-primary-400 bg-primary-500/10"
              >
                {muscle}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exercise List */}
      <div className="space-y-4">
        {workout.exercises.map((exercise, index) => {
          const exerciseDetails = getExerciseDetails(exercise.name);
          return (
            <ExerciseCard
              key={index}
              exercise={exercise}
              exerciseDetails={exerciseDetails}
              onCompleteSet={handleCompleteSet}
              getSetStatus={getSetStatus}
              isWorkoutActive={isWorkoutActive}
            />
          );
        })}
      </div>

      {/* Enhanced Workout Summary */}
      {Object.keys(workoutSets).length > 0 && (
        <Card className="bg-surface border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Today's Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(workoutSets).map(([exerciseName, sets]) => {
                const exerciseFromWorkout = workout.exercises.find(ex => ex.name === exerciseName);
                const targetSets = exerciseFromWorkout?.sets || 0;
                const completedSets = sets.filter(set => set.completed).length;
                const progressPercentage = targetSets > 0 ? (completedSets / targetSets) * 100 : 0;
                
                return (
                  <div key={exerciseName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{exerciseName}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">
                          {completedSets}/{targetSets} sets
                        </span>
                        {completedSets >= targetSets && (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={progressPercentage} 
                      className="h-1 bg-gray-700"
                    />
                  </div>
                );
              })}
            </div>
            
            <Button 
              className="w-full mt-6 bg-success hover:bg-green-600 text-white"
              disabled={getWorkoutProgress() < 100}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Workout
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
