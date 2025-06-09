import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkoutExercise, WorkoutSet } from "@/lib/types";
import { Plus, Minus } from "lucide-react";
import WeightProgressChart from "./WeightProgressChart";

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
  const [currentWeights, setCurrentWeights] = useState<number[]>(
    Array(exercise.sets).fill(0)
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleRepsChange = (setIndex: number, delta: number) => {
    const newReps = [...currentReps];
    newReps[setIndex] = Math.max(1, newReps[setIndex] + delta);
    setCurrentReps(newReps);
  };

  const handleWeightChange = (setIndex: number, delta: number) => {
    const newWeights = [...currentWeights];
    newWeights[setIndex] = Math.max(0, newWeights[setIndex] + delta);
    setCurrentWeights(newWeights);
  };

  const handleWeightInput = (setIndex: number, value: string) => {
    const newWeights = [...currentWeights];
    const weight = parseFloat(value) || 0;
    newWeights[setIndex] = Math.max(0, weight);
    setCurrentWeights(newWeights);
  };

  const handleCompleteSet = (setNumber: number) => {
    const reps = currentReps[setNumber - 1];
    const weight = currentWeights[setNumber - 1];
    onCompleteSet(exercise.name, setNumber, reps, weight > 0 ? weight : undefined);
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

  // Use animated GIF placeholder for all exercises
  const getExercisePoster = () => {
    return "/placeholder-exercise.gif";
  };

  return (
    <Card className="bg-surface border-gray-700 overflow-hidden">
      {/* Video Section */}
      <div className="relative">
        <div className="relative h-48 bg-gray-800">
          <img
            src={getExercisePoster()}
            alt={`${exercise.name} demonstration`}
            className="w-full h-full object-contain bg-gray-900"
          />
          
          {/* Exercise demo label */}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
            Exercise Demo
          </div>
          
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
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-medium">
            <div className="text-center">SET</div>
            <div className="text-center">WEIGHT (lbs)</div>
            <div className="text-center">REPS</div>
          </div>
          
          {Array.from({ length: exercise.sets }, (_, index) => {
            const setNumber = index + 1;
            const isCompleted = getSetStatus(exercise.name, setNumber);
            
            return (
              <div key={setNumber} className={`grid grid-cols-3 gap-2 items-center p-3 rounded-lg ${
                isCompleted ? 'bg-success/20 border border-success/30' : 'bg-gray-800/50'
              }`}>
                {/* Set Number */}
                <div className="text-center">
                  <span className="text-white font-medium">{setNumber}</span>
                </div>
                
                {/* Weight Input */}
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={() => handleWeightChange(index, -2.5)}
                    className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs p-0"
                    disabled={isCompleted}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  
                  <Input
                    type="number"
                    value={currentWeights[index] || ''}
                    onChange={(e) => handleWeightInput(index, e.target.value)}
                    placeholder="0"
                    className="w-12 h-6 text-center text-xs bg-gray-700 border-gray-600 text-white p-1"
                    disabled={isCompleted}
                    step="2.5"
                    min="0"
                  />
                  
                  <Button
                    onClick={() => handleWeightChange(index, 2.5)}
                    className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs p-0"
                    disabled={isCompleted}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Reps Input */}
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={() => handleRepsChange(index, -1)}
                    className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs p-0"
                    disabled={isCompleted}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  
                  <span className="w-8 text-center text-white font-medium text-sm">
                    {currentReps[index]}
                  </span>
                  
                  <Button
                    onClick={() => handleRepsChange(index, 1)}
                    className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs p-0"
                    disabled={isCompleted}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Complete Set Button */}
                <div className="col-span-3 mt-2">
                  <Button
                    onClick={() => handleCompleteSet(setNumber)}
                    disabled={isCompleted}
                    className={`w-full py-2 rounded-lg text-sm font-medium ${
                      isCompleted
                        ? "bg-success text-white cursor-not-allowed"
                        : "bg-success hover:bg-green-600 text-white"
                    }`}
                  >
                    {isCompleted ? "✓ Set Complete" : "Complete Set"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weight Progress Chart */}
        <WeightProgressChart 
          exerciseName={exercise.name} 
          className="mt-4"
        />

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
