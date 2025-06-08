import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface OnboardingData {
  goal?: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  injuries?: string[];
  equipment?: string[];
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    injuries: [],
    equipment: [],
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/landing");
    },
  });

  const totalSteps = 5;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const updateProfileMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      // Convert string values to numbers where needed
      const profileData = {
        ...data,
        goal: data.goal, // Keep goal as string (weight-loss, muscle-gain, maintenance)
        weight: data.weight ? parseFloat(data.weight.toString()) : undefined,
        height: data.height ? parseInt(data.height.toString()) : undefined,
        age: data.age ? parseInt(data.age.toString()) : undefined,
        onboardingCompleted: true,
      };
      
      const response = await apiRequest("PUT", "/api/user/profile", profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Complete!",
        description: "Welcome to Ignite AI. Let's start your fitness journey!",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      updateProfileMutation.mutate(formData);
    }
  };

  const handleGoalSelect = (goal: string) => {
    setFormData({ ...formData, goal });
    setTimeout(() => handleNext(), 300);
  };

  const handleGenderSelect = (gender: string) => {
    setFormData({ ...formData, gender });
  };

  const handleActivitySelect = (activityLevel: string) => {
    setFormData({ ...formData, activityLevel });
  };

  const toggleInjury = (injury: string) => {
    const injuries = formData.injuries || [];
    const newInjuries = injuries.includes(injury)
      ? injuries.filter(i => i !== injury)
      : [...injuries, injury];
    setFormData({ ...formData, injuries: newInjuries });
  };

  const toggleEquipment = (equipment: string) => {
    const equipmentList = formData.equipment || [];
    const newEquipment = equipmentList.includes(equipment)
      ? equipmentList.filter(e => e !== equipment)
      : [...equipmentList, equipment];
    setFormData({ ...formData, equipment: newEquipment });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.goal;
      case 2:
        return !!(formData.height && formData.weight && formData.age && formData.gender);
      case 3:
        return !!formData.activityLevel;
      case 4:
        return true; // Injuries are optional
      case 5:
        return true; // Equipment is optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-md mx-auto px-6 py-8 h-screen flex flex-col">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {currentStep > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-gray-400 hover:text-white p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <span className="text-sm text-gray-400">Step {currentStep} of {totalSteps}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{Math.round(progressPercentage)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="text-gray-400 hover:text-white text-xs"
                disabled={logoutMutation.isPending}
              >
                Exit
              </Button>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="flex-1">
          {currentStep === 1 && (
            <div>
              <h1 className="text-3xl font-bold mb-2">What's your main goal?</h1>
              <p className="text-gray-400 mb-8">This helps us personalize your coaching experience.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => handleGoalSelect('weight-loss')}
                  className="w-full p-4 bg-surface rounded-medium text-left hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <i className="fas fa-weight text-primary-500 w-6 mr-4"></i>
                    <div>
                      <div className="font-semibold">Lose Weight</div>
                      <div className="text-sm text-gray-400">Reduce body fat and get leaner</div>
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleGoalSelect('muscle-gain')}
                  className="w-full p-4 bg-surface rounded-medium text-left hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <i className="fas fa-dumbbell text-primary-500 w-6 mr-4"></i>
                    <div>
                      <div className="font-semibold">Build Muscle</div>
                      <div className="text-sm text-gray-400">Increase strength and muscle mass</div>
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleGoalSelect('maintenance')}
                  className="w-full p-4 bg-surface rounded-medium text-left hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <i className="fas fa-heart text-primary-500 w-6 mr-4"></i>
                    <div>
                      <div className="font-semibold">Stay Healthy</div>
                      <div className="text-sm text-gray-400">Maintain current fitness level</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h1 className="text-3xl font-bold mb-2">Tell us about yourself</h1>
              <p className="text-gray-400 mb-8">We need some basic info to calculate your macros.</p>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium mb-2">Height (cm)</Label>
                    <Input
                      type="number"
                      placeholder="170"
                      value={formData.height || ''}
                      onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                      className="bg-surface border-gray-600"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">Weight (kg)</Label>
                    <Input
                      type="number"
                      placeholder="70"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      className="bg-surface border-gray-600"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium mb-2">Age</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    className="bg-surface border-gray-600"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium mb-2">Gender</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleGenderSelect('female')}
                      className={`p-3 rounded-medium transition-colors ${
                        formData.gender === 'female' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-surface hover:bg-gray-700'
                      }`}
                    >
                      Female
                    </button>
                    <button
                      onClick={() => handleGenderSelect('male')}
                      className={`p-3 rounded-medium transition-colors ${
                        formData.gender === 'male' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-surface hover:bg-gray-700'
                      }`}
                    >
                      Male
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h1 className="text-3xl font-bold mb-2">Activity Level</h1>
              <p className="text-gray-400 mb-8">How active are you currently?</p>
              
              <div className="space-y-4">
                {[
                  { key: 'sedentary', title: 'Sedentary', desc: 'Little to no exercise' },
                  { key: 'light', title: 'Light', desc: 'Light exercise 1-3 days/week' },
                  { key: 'moderate', title: 'Moderate', desc: 'Moderate exercise 3-5 days/week' },
                  { key: 'active', title: 'Active', desc: 'Hard exercise 6-7 days/week' },
                  { key: 'very_active', title: 'Very Active', desc: 'Very hard exercise, physical job' },
                ].map((level) => (
                  <button
                    key={level.key}
                    onClick={() => handleActivitySelect(level.key)}
                    className={`w-full p-4 rounded-medium text-left transition-colors ${
                      formData.activityLevel === level.key
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-semibold">{level.title}</div>
                    <div className="text-sm opacity-70">{level.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h1 className="text-3xl font-bold mb-2">Any injuries?</h1>
              <p className="text-gray-400 mb-8">We'll modify exercises to keep you safe (optional).</p>
              
              <div className="space-y-3">
                {[
                  'Lower back',
                  'Knees',
                  'Shoulders',
                  'Wrists',
                  'Neck',
                  'Ankles',
                  'Hips',
                  'Other',
                ].map((injury) => (
                  <button
                    key={injury}
                    onClick={() => toggleInjury(injury)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      formData.injuries?.includes(injury)
                        ? 'bg-warning text-black'
                        : 'bg-surface hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{injury}</span>
                      {formData.injuries?.includes(injury) && (
                        <i className="fas fa-check"></i>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h1 className="text-3xl font-bold mb-2">Available Equipment</h1>
              <p className="text-gray-400 mb-8">What equipment do you have access to?</p>
              
              <div className="space-y-3">
                {[
                  'Dumbbells',
                  'Barbell',
                  'Resistance bands',
                  'Pull-up bar',
                  'Kettlebells',
                  'Gym membership',
                  'Bodyweight only',
                ].map((equipment) => (
                  <button
                    key={equipment}
                    onClick={() => toggleEquipment(equipment)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      formData.equipment?.includes(equipment)
                        ? 'bg-success text-white'
                        : 'bg-surface hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{equipment}</span>
                      {formData.equipment?.includes(equipment) && (
                        <i className="fas fa-check"></i>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="pt-8">
          <Button
            onClick={handleNext}
            disabled={!canProceed() || updateProfileMutation.isPending}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-full font-semibold"
          >
            {updateProfileMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Setting up your profile...</span>
              </div>
            ) : currentStep === totalSteps ? (
              "Complete Setup"
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
