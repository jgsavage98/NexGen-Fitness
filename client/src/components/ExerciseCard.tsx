import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutExercise, WorkoutSet, Exercise } from "@/lib/types";
import { Plus, Minus, Play, Info, Target, Dumbbell, Clock, CheckCircle2 } from "lucide-react";
import WeightProgressChart from "./WeightProgressChart";

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseDetails: Exercise | null;
  onCompleteSet: (exerciseName: string, setNumber: number, reps: number, weight?: number) => void;
  getSetStatus: (exerciseName: string, setNumber: number) => boolean;
  isWorkoutActive: boolean;
}

export default function ExerciseCard({ 
  exercise, 
  exerciseDetails, 
  onCompleteSet, 
  getSetStatus, 
  isWorkoutActive 
}: ExerciseCardProps) {
  const [currentSet, setCurrentSet] = useState(1);
  const [reps, setReps] = useState<number>(parseInt(exercise.reps.split('-')[0]) || 10);
  const [weight, setWeight] = useState<number>(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const totalSets = exercise.sets;
  const completedSets = Array.from({ length: totalSets }, (_, i) => 
    getSetStatus(exercise.name, i + 1)
  ).filter(Boolean).length;

  const handleCompleteSet = () => {
    onCompleteSet(exercise.name, currentSet, reps, weight || undefined);
    
    if (currentSet < totalSets) {
      setCurrentSet(currentSet + 1);
      // Start rest timer
      setIsResting(true);
      setRestTimer(exercise.rest || 60);
      
      const timer = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const formatRestTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentSetCompleted = getSetStatus(exercise.name, currentSet);
  const isExerciseCompleted = completedSets >= totalSets;

  return (
    <Card className="bg-surface border-gray-700 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg mb-2">{exercise.name}</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Dumbbell className="w-4 h-4" />
                <span>{exercise.sets} sets × {exercise.reps} reps</span>
              </div>
              {exercise.rest && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{exercise.rest}s rest</span>
                </div>
              )}
              {exerciseDetails?.difficulty && (
                <Badge variant="outline" className="border-gray-600 text-gray-400">
                  {exerciseDetails.difficulty}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Exercise completion indicator */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {completedSets}/{totalSets}
            </span>
            {isExerciseCompleted && (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-3">
          <div className="flex space-x-2">
            {Array.from({ length: totalSets }, (_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  getSetStatus(exercise.name, index + 1)
                    ? 'bg-green-500'
                    : index + 1 === currentSet
                    ? 'bg-primary-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="perform" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="perform" className="text-gray-300 data-[state=active]:text-white">
              Perform
            </TabsTrigger>
            <TabsTrigger value="details" className="text-gray-300 data-[state=active]:text-white">
              Details
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-gray-300 data-[state=active]:text-white">
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perform" className="space-y-4 mt-4">
            {isResting ? (
              <div className="text-center py-6 space-y-3">
                <Clock className="w-8 h-8 text-primary-500 mx-auto" />
                <div>
                  <div className="text-2xl font-mono text-primary-500 font-bold">
                    {formatRestTimer(restTimer)}
                  </div>
                  <div className="text-sm text-gray-400">Rest between sets</div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsResting(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Skip Rest
                </Button>
              </div>
            ) : (
              <>
                {/* Current Set Display */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center mb-4">
                    <div className="text-lg font-semibold text-white">
                      Set {currentSet} of {totalSets}
                    </div>
                    <div className="text-sm text-gray-400">
                      Target: {exercise.reps} reps
                    </div>
                  </div>

                  {/* Input controls */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-gray-400 text-sm">Reps</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReps(Math.max(1, reps - 1))}
                          className="border-gray-600 text-gray-300 h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={reps}
                          onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                          className="text-center bg-gray-700 border-gray-600 text-white"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReps(reps + 1)}
                          className="border-gray-600 text-gray-300 h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-400 text-sm">Weight (lbs)</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWeight(Math.max(0, weight - 5))}
                          className="border-gray-600 text-gray-300 h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
                          className="text-center bg-gray-700 border-gray-600 text-white"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWeight(weight + 5)}
                          className="border-gray-600 text-gray-300 h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Complete set button */}
                  <Button
                    onClick={handleCompleteSet}
                    disabled={!isWorkoutActive || isCurrentSetCompleted}
                    className={`w-full ${
                      isCurrentSetCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-primary-500 hover:bg-primary-600 text-white'
                    }`}
                  >
                    {isCurrentSetCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Set Completed
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Complete Set
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            {exerciseDetails ? (
              <div className="space-y-4">
                {/* Exercise thumbnail/GIF */}
                {exerciseDetails.animatedGifUrl && (
                  <div className="w-full bg-gray-800 rounded-lg overflow-hidden flex justify-center">
                    <img
                      src={exerciseDetails.animatedGifUrl}
                      alt={exerciseDetails.name}
                      className="w-full max-w-md object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* Exercise metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400 text-sm">Body Part</Label>
                    <div className="text-white">{exerciseDetails.bodyPart}</div>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Equipment</Label>
                    <div className="text-white">{exerciseDetails.equipmentType}</div>
                  </div>
                </div>

                {/* Target muscles */}
                {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                  <div>
                    <Label className="text-gray-400 text-sm mb-2 block">
                      <Target className="w-4 h-4 inline mr-1" />
                      Target Muscles
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {exercise.targetMuscles.map((muscle, index) => (
                        <Badge 
                          key={index}
                          variant="outline"
                          className="border-primary-500/30 text-primary-400 bg-primary-500/10"
                        >
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {exerciseDetails.description && (
                  <div>
                    <Label className="text-gray-400 text-sm mb-2 block">
                      <Info className="w-4 h-4 inline mr-1" />
                      Description
                    </Label>
                    <div className="text-gray-300 text-sm leading-relaxed max-h-32 overflow-y-auto">
                      {exerciseDetails.description}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>No additional details available for this exercise.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4 mt-4">
            <WeightProgressChart exerciseName={exercise.name} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}