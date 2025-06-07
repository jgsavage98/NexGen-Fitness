import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutExercise, WorkoutSet } from "@/lib/types";

interface ExerciseVideoCardProps {
  exercise: WorkoutExercise;
  onCompleteSet: (exerciseName: string, setNumber: number, reps: number, weight?: number) => void;
  getSetStatus: (exerciseName: string, setNumber: number) => boolean;
}

export default function ExerciseVideoCard({ 
  exercise, 
  onCompleteSet, 
  getSetStatus 
}: ExerciseVideoCardProps) {
  const [currentReps, setCurrentReps] = useState<number[]>(
    Array(exercise.sets).fill(parseInt(exercise.reps.split('-')[0]) || 12)
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleRepsChange = (setIndex: number, delta: number) => {
    const newReps = [...currentReps];
    newReps[setIndex] = Math.max(1, newReps[setIndex] + delta);
    setCurrentReps(newReps);
  };

  const handleCompleteSet = (setNumber: number) => {
    const reps = currentReps[setNumber - 1];
    onCompleteSet(exercise.name, setNumber, reps);
  };

  const handleSwapExercise = () => {
    // TODO: Implement exercise swap functionality
    console.log("Swap exercise:", exercise.name);
  };

  const handlePlayVideo = () => {
    setIsVideoPlaying(true);
    // TODO: Implement video playback
    console.log("Play video for:", exercise.name);
  };

  const getMuscleGroupColor = (muscle: string, isPrimary: boolean) => {
    return isPrimary ? "bg-muscle-primary" : "bg-muscle-secondary";
  };

  // Generate placeholder video poster based on exercise type
  const getExercisePoster = () => {
    const exerciseName = exercise.name.toLowerCase();
    if (exerciseName.includes('push')) {
      return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=200&fit=crop";
    } else if (exerciseName.includes('row') || exerciseName.includes('pull')) {
      return "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=200&fit=crop";
    } else if (exerciseName.includes('squat') || exerciseName.includes('leg')) {
      return "https://images.unsplash.com/photo-1566241477147-ba9c8c2e2b13?w=400&h=200&fit=crop";
    } else {
      return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=200&fit=crop";
    }
  };

  return (
    <Card className="bg-surface border-gray-700 overflow-hidden">
      {/* Video Section */}
      <div className="relative">
        <div className="relative h-48 bg-gray-800">
          <img
            src={getExercisePoster()}
            alt={`${exercise.name} demonstration`}
            className="w-full h-full object-cover"
          />
          
          {!isVideoPlaying && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Button
                onClick={handlePlayVideo}
                className="w-16 h-16 bg-white/90 hover:bg-white rounded-full flex items-center justify-center p-0"
              >
                <i className="fas fa-play text-gray-800 ml-1 text-xl"></i>
              </Button>
            </div>
          )}
          
          <div className="absolute top-4 right-4">
            <Button
              onClick={handleSwapExercise}
              className="bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded-full text-sm"
            >
              <i className="fas fa-exchange-alt mr-1"></i>
              Swap
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Exercise Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
          <div className="flex space-x-2">
            {exercise.targetMuscles.slice(0, 2).map((muscle, index) => (
              <span
                key={muscle}
                className={`px-2 py-1 rounded-full text-xs text-white ${
                  getMuscleGroupColor(muscle, index === 0)
                }`}
              >
                {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
              </span>
            ))}
          </div>
        </div>

        {/* Exercise Details */}
        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
          <span>{exercise.sets} sets</span>
          <span>{exercise.reps} reps</span>
          <span>{exercise.rest}s rest</span>
        </div>

        {/* Exercise Description */}
        <p className="text-sm text-gray-300 mb-4">
          {exercise.name.includes('Push-up') && 
            "Start in plank position with hands slightly wider than shoulders. Lower your body until chest nearly touches the floor, then push back up."
          }
          {exercise.name.includes('Row') && 
            "Bend at the waist with weights in hands. Pull the weights to your sides, squeezing your shoulder blades together."
          }
          {exercise.name.includes('Press') && 
            "Stand with feet shoulder-width apart. Press the weight overhead while keeping your core engaged."
          }
          {!exercise.name.includes('Push-up') && !exercise.name.includes('Row') && !exercise.name.includes('Press') &&
            "Perform this exercise with proper form, focusing on controlled movements and full range of motion."
          }
        </p>

        {/* Set Tracking */}
        <div className="space-y-3">
          {Array.from({ length: exercise.sets }, (_, index) => {
            const setNumber = index + 1;
            const isCompleted = getSetStatus(exercise.name, setNumber);
            
            return (
              <div key={setNumber} className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Set {setNumber}</span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleRepsChange(index, -1)}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-sm p-0"
                    disabled={isCompleted}
                  >
                    -
                  </Button>
                  
                  <span className="w-8 text-center text-white font-medium">
                    {currentReps[index]}
                  </span>
                  
                  <Button
                    onClick={() => handleRepsChange(index, 1)}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-sm p-0"
                    disabled={isCompleted}
                  >
                    +
                  </Button>
                  
                  <Button
                    onClick={() => handleCompleteSet(setNumber)}
                    disabled={isCompleted}
                    className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                      isCompleted
                        ? "bg-success text-white cursor-not-allowed"
                        : "bg-success hover:bg-green-600 text-white"
                    }`}
                  >
                    {isCompleted ? "✓ Done" : "✓"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Exercise Notes */}
        <div className="mt-4 p-3 bg-dark rounded-lg">
          <div className="flex items-start space-x-2">
            <i className="fas fa-lightbulb text-warning text-sm mt-0.5"></i>
            <div className="text-xs text-gray-400">
              <span className="font-medium text-warning">Tip:</span>
              {exercise.difficulty === 'beginner' && " Focus on proper form over speed or weight."}
              {exercise.difficulty === 'intermediate' && " Maintain control throughout the full range of motion."}
              {exercise.difficulty === 'advanced' && " Challenge yourself while maintaining perfect technique."}
              {!exercise.difficulty && " Listen to your body and adjust intensity as needed."}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
