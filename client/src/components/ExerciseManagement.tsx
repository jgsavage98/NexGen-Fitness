import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Filter, Plus, Search } from "lucide-react";

// Since proxy approach fails due to Replit network restrictions, 
// we'll use direct URLs and handle CORS gracefully
function getImageUrl(originalUrl: string): string {
  return originalUrl || '';
}

interface Exercise {
  id: number;
  name: string;
  description: string;
  category: string;
  exerciseType: string;
  equipmentType: string;
  bodyPart: string;
  difficulty: string;
  animatedGifUrl: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export default function ExerciseManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterEquipment, setFilterEquipment] = useState("all");
  const [filterBodyPart, setFilterBodyPart] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    exerciseType: "strength",
    equipmentType: "bodyweight",
    bodyPart: "chest",
    animatedGifUrl: "",
    difficulty: "intermediate"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all exercises
  const { data: exercises = [], isLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    refetchOnMount: true,
  });

  // Add new exercise mutation
  const addExerciseMutation = useMutation({
    mutationFn: async (exerciseData: any) => {
      console.log("Creating exercise with data:", exerciseData);
      
      // Ensure required fields are included
      const fullExerciseData = {
        ...exerciseData,
        category: exerciseData.bodyPart || "General", // Default category
        primaryMuscles: exerciseData.primaryMuscles || [exerciseData.bodyPart || "General"],
        secondaryMuscles: exerciseData.secondaryMuscles || []
      };
      
      console.log("Full exercise data:", fullExerciseData);
      return await apiRequest("POST", "/api/exercises", fullExerciseData);
    },
    onSuccess: (data) => {
      console.log("Exercise created successfully:", data);
      toast({
        title: "Exercise Added",
        description: "New exercise has been successfully added to the database.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      setShowAddForm(false);
      setNewExercise({
        name: "",
        description: "",
        exerciseType: "strength",
        equipmentType: "bodyweight",
        bodyPart: "chest",
        animatedGifUrl: "",
        difficulty: "intermediate"
      });
    },
    onError: (error: Error) => {
      console.error("Exercise creation error:", error);
      toast({
        title: "Error",
        description: `Failed to add exercise: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter exercises based on search and filters
  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || exercise.exerciseType === filterType;
    const matchesEquipment = filterEquipment === "all" || exercise.equipmentType === filterEquipment;
    const matchesBodyPart = filterBodyPart === "all" || exercise.bodyPart === filterBodyPart;
    
    return matchesSearch && matchesType && matchesEquipment && matchesBodyPart;
  });

  // Get unique values for filters
  const exerciseTypes = exercises.length > 0 ? 
    exercises.reduce((acc: string[], e) => {
      if (!acc.includes(e.exerciseType)) acc.push(e.exerciseType);
      return acc;
    }, []) : [];
  
  const equipmentTypes = exercises.length > 0 ? 
    exercises.reduce((acc: string[], e) => {
      if (!acc.includes(e.equipmentType)) acc.push(e.equipmentType);
      return acc;
    }, []) : [];
  
  const bodyParts = exercises.length > 0 ? 
    exercises.reduce((acc: string[], e) => {
      if (!acc.includes(e.bodyPart)) acc.push(e.bodyPart);
      return acc;
    }, []) : [];

  const handleAddExercise = () => {
    if (!newExercise.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Exercise name is required.",
        variant: "destructive",
      });
      return;
    }

    addExerciseMutation.mutate(newExercise);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Exercise Database</h2>
        <p className="text-gray-400 mb-6">
          Manage your exercise database for AI workout generation. Total exercises: {exercises.length}
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-surface border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Search & Filter Exercises
            </span>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary-500 hover:bg-primary-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search exercises by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300">Exercise Type</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 mt-1"
              >
                <option value="all">All Types</option>
                {exerciseTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Equipment</Label>
              <select
                value={filterEquipment}
                onChange={(e) => setFilterEquipment(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 mt-1"
              >
                <option value="all">All Equipment</option>
                {equipmentTypes.map(equipment => (
                  <option key={equipment} value={equipment}>{equipment}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Body Part</Label>
              <select
                value={filterBodyPart}
                onChange={(e) => setFilterBodyPart(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 mt-1"
              >
                <option value="all">All Body Parts</option>
                {bodyParts.map(bodyPart => (
                  <option key={bodyPart} value={bodyPart}>{bodyPart}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Exercise Form */}
          {showAddForm && (
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Add New Exercise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Exercise Name</Label>
                    <Input
                      value={newExercise.name}
                      onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                      placeholder="e.g., Push-ups"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Animated GIF URL</Label>
                    <Input
                      value={newExercise.animatedGifUrl}
                      onChange={(e) => setNewExercise({...newExercise, animatedGifUrl: e.target.value})}
                      placeholder="https://example.com/exercise.gif"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Exercise Type</Label>
                    <select
                      value={newExercise.exerciseType}
                      onChange={(e) => setNewExercise({...newExercise, exerciseType: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 mt-1"
                    >
                      <option value="strength">Strength</option>
                      <option value="cardio">Cardio</option>
                      <option value="flexibility">Flexibility</option>
                      <option value="balance">Balance</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Equipment Type</Label>
                    <select
                      value={newExercise.equipmentType}
                      onChange={(e) => setNewExercise({...newExercise, equipmentType: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 mt-1"
                    >
                      <option value="bodyweight">Bodyweight</option>
                      <option value="dumbbells">Dumbbells</option>
                      <option value="barbell">Barbell</option>
                      <option value="machine">Machine</option>
                      <option value="resistance-band">Resistance Band</option>
                      <option value="cable">Cable</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Body Part</Label>
                    <select
                      value={newExercise.bodyPart}
                      onChange={(e) => setNewExercise({...newExercise, bodyPart: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 mt-1"
                    >
                      <option value="chest">Chest</option>
                      <option value="back">Back</option>
                      <option value="shoulders">Shoulders</option>
                      <option value="arms">Arms</option>
                      <option value="legs">Legs</option>
                      <option value="core">Core</option>
                      <option value="full-body">Full Body</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({...newExercise, description: e.target.value})}
                    placeholder="Describe the exercise, its benefits, and proper form..."
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddExercise}
                    disabled={addExerciseMutation.isPending}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    {addExerciseMutation.isPending ? "Adding..." : "Add Exercise"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-surface border-gray-700 animate-pulse">
              <CardContent className="p-4">
                <div className="w-full h-48 bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-700 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredExercises.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No exercises found</h3>
            <p className="text-gray-500">
              {exercises.length === 0 
                ? "Start by adding exercises to your database or importing from your dataset."
                : "Try adjusting your search terms or filters."
              }
            </p>
          </div>
        ) : (
          filteredExercises.map((exercise) => {
            // Simplified exercise render - removed proxy URL logging
            
            return (
              <Card key={exercise.id} className="bg-surface border-gray-700 hover:border-gray-600 transition-colors">
                <CardContent className="p-4">
                  {/* Exercise GIF/Image */}
                  <div className="relative w-full h-48 bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {exercise.animatedGifUrl ? (
                      <img
                        src={exercise.animatedGifUrl}
                        alt={exercise.name}
                        className="w-full h-full object-cover rounded-lg"
                        onLoad={() => console.log('✅ GIF loaded successfully:', exercise.name)}
                        onError={(e) => {
                          console.log('❌ GIF blocked by CORS/network restrictions for:', exercise.name);
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          const fallbackDiv = img.nextElementSibling as HTMLElement;
                          if (fallbackDiv) {
                            fallbackDiv.classList.remove('hidden');
                          }
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center text-gray-400 text-center p-4 ${exercise.animatedGifUrl ? 'hidden' : ''}`}>
                      <div>
                        <Dumbbell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-1">Exercise Animation</p>
                        <p className="text-xs text-gray-500">
                          {exercise.animatedGifUrl ? 'Temporarily restricted by network policies' : 'No preview available'}
                        </p>
                      </div>
                    </div>
                  </div>

                {/* Exercise Info */}
                <h3 className="text-lg font-semibold text-white mb-2">{exercise.name}</h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{exercise.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                    {exercise.exerciseType}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                    {exercise.equipmentType}
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-600 text-white text-xs">
                    {exercise.bodyPart}
                  </Badge>
                </div>

                {/* Difficulty */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Difficulty:</span>
                  <Badge 
                    variant={exercise.difficulty === 'beginner' ? 'default' : 
                            exercise.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {exercise.difficulty}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>

      {/* Exercise Count */}
      {filteredExercises.length > 0 && (
        <div className="text-center text-gray-400">
          Showing {filteredExercises.length} of {exercises.length} exercises
        </div>
      )}
    </div>
  );
}