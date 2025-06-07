import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ExerciseVideoCard from "./ExerciseVideoCard";
import { Workout, WorkoutSet } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

export default function WorkoutTab() {
  const [workoutSets, setWorkoutSets] = useState<Record<string, WorkoutSet[]>>({});
  const queryClient = useQueryClient();

  const { data: workout, isLoading } = useQuery<Workout>({
    queryKey: ["/api/workout/today"],
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

  const handleCompleteSet = (exerciseName: string, setNumber: number, reps: number, weight?: number) => {
    const exerciseKey = exerciseName;
    const currentSets = workoutSets[exerciseKey] || [];
    
    const newSet: WorkoutSet = {
      exerciseId: 0, // We'll need to map this properly
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

    // Log to database
    logExerciseMutation.mutate({
      exerciseId: 0, // Would need proper exercise ID mapping
      sets: 1,
      reps,
      weight,
    });
  };

  const getSetStatus = (exerciseName: string, setNumber: number) => {
    const exerciseSets = workoutSets[exerciseName] || [];
    return exerciseSets[setNumber - 1]?.completed || false;
  };

  if (isLoading) {
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
          <i className="fas fa-dumbbell text-gray-600 text-4xl mb-4"></i>
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
      {/* Workout Header */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{workout.name}</h2>
              <p className="text-gray-400">
                Estimated time: {workout.estimatedDuration || 45} minutes
              </p>
            </div>
            <Button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-full font-semibold">
              <i className="fas fa-play mr-2"></i>Start
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exercise List */}
      <div className="space-y-4">
        {workout.exercises.map((exercise, index) => (
          <ExerciseVideoCard
            key={index}
            exercise={exercise}
            onCompleteSet={handleCompleteSet}
            getSetStatus={getSetStatus}
          />
        ))}
      </div>

      {/* Workout Summary */}
      {Object.keys(workoutSets).length > 0 && (
        <Card className="bg-surface border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Today's Progress</h3>
            <div className="space-y-2">
              {Object.entries(workoutSets).map(([exerciseName, sets]) => {
                const completedSets = sets.filter(set => set.completed).length;
                const totalSets = sets.length;
                return (
                  <div key={exerciseName} className="flex items-center justify-between py-2">
                    <span className="text-white font-medium">{exerciseName}</span>
                    <span className="text-sm text-gray-400">
                      {completedSets}/{totalSets} sets
                    </span>
                  </div>
                );
              })}
            </div>
            
            <Button className="w-full mt-4 bg-success hover:bg-green-600 text-white">
              Complete Workout
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
