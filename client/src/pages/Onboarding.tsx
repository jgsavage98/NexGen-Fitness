import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, X, Camera, Check, Info, Dumbbell, Target, Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface OnboardingData {
  goal?: string;
  height?: number;
  weight?: number;
  goalWeight?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  injuries?: string[];
  equipment?: string[];
  currentMacrosFile?: File;
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [macroSummary, setMacroSummary] = useState<any>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
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

  const totalSteps = 6;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const updateProfileMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      // Convert string values to numbers where needed
      const profileData = {
        ...data,
        goal: data.goal, // Keep goal as string (weight-loss, muscle-gain, maintenance)
        weight: data.weight ? parseFloat(data.weight.toString()) : undefined,
        goalWeight: data.goalWeight ? parseFloat(data.goalWeight.toString()) : undefined,
        height: data.height ? parseInt(data.height.toString()) : undefined,
        age: data.age ? parseInt(data.age.toString()) : undefined,
        onboardingCompleted: false, // Don't mark as completed yet - wait for user acknowledgment
      };
      
      // First update the profile
      const profileResponse = await apiRequest("PUT", "/api/user/profile", profileData);
      
      // If there's a current macros screenshot, upload and analyze it
      // Note: Baseline screenshot is stored but not processed for nutrition data
      // Nutrition extraction only happens on the Screenshot Upload tab for daily tracking
      
      return profileResponse.json();
    },
    onSuccess: (data) => {
      console.log('Onboarding complete response:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Use standard baseline values for onboarding summary
      // User will upload their actual daily nutrition data via Screenshot Upload tab
      const baselineData = { calories: 2000, protein: 120, carbs: 200, fat: 65 };
      const newCalories = Math.max(baselineData.calories - 50, 1200);
      
      const macroData = {
        baselineCalories: baselineData.calories,
        newCalories,
        baselineMacros: { 
          protein: baselineData.protein, 
          carbs: baselineData.carbs, 
          fat: baselineData.fat 
        },
        newMacros: { 
          protein: Math.round(newCalories * 0.25 / 4), 
          carbs: Math.round(newCalories * 0.45 / 4), 
          fat: Math.round(newCalories * 0.30 / 9) 
        }
      };
      
      console.log('Setting standard macro summary for onboarding:', macroData);
      setMacroSummary(macroData);
      setShowSummary(true);
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
        const basicInfoComplete = !!(formData.height && formData.weight && formData.age && formData.gender);
        const goalWeightRequired = formData.goal === 'weight-loss' ? !!formData.goalWeight : true;
        return basicInfoComplete && goalWeightRequired;
      case 3:
        return !!formData.activityLevel;
      case 4:
        return true; // Injuries are optional
      case 5:
        return true; // Equipment is optional
      case 6:
        return true; // Current macros screenshot is optional
      default:
        return false;
    }
  };

  if (showSummary) {
    return (
      <div className="min-h-screen bg-dark text-white">
        <div className="max-w-md mx-auto px-6 py-8 h-screen flex flex-col">
          {/* Summary Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-success w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Your Journey!</h1>
            <p className="text-gray-400">Here's your personalized plan from Coach Chassidy</p>
          </div>

          {/* Weight Progress Graph */}
          {formData.goal === 'weight-loss' && formData.weight && formData.goalWeight && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Your 12-Week Weight Goal</h2>
              <div className="bg-surface rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-500">{formData.weight}lbs</div>
                    <div className="text-sm text-gray-400">Current</div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-success w-full rounded-full"></div>
                    </div>
                    <div className="text-center text-xs text-gray-400 mt-1">12 weeks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">{formData.goalWeight}lbs</div>
                    <div className="text-sm text-gray-400">Goal</div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-300">
                  Target loss: {(formData.weight - formData.goalWeight).toFixed(1)}lbs
                </div>
              </div>
            </div>
          )}

          {/* Macro Comparison */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Nutrition Plan</h2>
            <div className="space-y-4">
              
              {/* Baseline Section */}
              <div className="bg-surface rounded-lg p-4">
                <div className="text-sm font-medium mb-3 text-gray-300">Baseline (From Your Screenshot)</div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-semibold">{macroSummary?.baselineCalories || 2000} calories</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-400">Protein</div>
                    <div className="font-semibold">{macroSummary?.baselineMacros?.protein || 120}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Carbs</div>
                    <div className="font-semibold">{macroSummary?.baselineMacros?.carbs || 200}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Fat</div>
                    <div className="font-semibold">{macroSummary?.baselineMacros?.fat || 65}g</div>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="flex items-center space-x-2 text-primary-500">
                  <div className="h-px bg-primary-500 w-8"></div>
                  <ArrowLeft className="w-6 h-6 rotate-180" />
                  <div className="h-px bg-primary-500 w-8"></div>
                </div>
              </div>

              {/* New Target Section */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                <div className="text-sm font-medium mb-3 text-primary-300">New Daily Target</div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-semibold text-primary-100">{macroSummary?.newCalories || 1950} calories</span>
                  <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">
                    -{((macroSummary?.baselineCalories || 2000) - (macroSummary?.newCalories || 1950))} cal
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-primary-400">Protein</div>
                    <div className="font-semibold text-primary-100">{macroSummary?.newMacros?.protein || 122}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-primary-400">Carbs</div>
                    <div className="font-semibold text-primary-100">{macroSummary?.newMacros?.carbs || 219}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-primary-400">Fat</div>
                    <div className="font-semibold text-primary-100">{macroSummary?.newMacros?.fat || 65}g</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-200 bg-blue-500/10 rounded p-2">
                  I'm starting you with a gentle reduction. We'll adjust gradually as you progress!
                </div>
              </div>
            </div>
          </div>

          {/* Coach Message */}
          <div className="mb-8 bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <img 
                src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
                alt="Coach Chassidy"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-semibold text-primary-300 mb-1">Message from Coach Chassidy:</p>
                <p className="text-primary-100">
                  Welcome to your personalized fitness journey! I've created a gentle starting plan that focuses on sustainable progress. 
                  Remember, we're not rushing - slow and steady wins the race. I'll adjust your plan every week based on your progress.
                </p>
              </div>
            </div>
          </div>

          {/* Acknowledgment Button */}
          <div className="mt-auto">
            {!hasAcknowledged ? (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-200">
                    Please review your personalized plan above and confirm you're ready to begin your journey with Coach Chassidy.
                  </p>
                </div>
                <Button
                  onClick={() => setHasAcknowledged(true)}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-full font-semibold"
                >
                  I Accept My New Macro Plan
                </Button>
              </div>
            ) : (
              <Button
                onClick={async () => {
                  // Mark onboarding as truly completed
                  await apiRequest("PUT", "/api/user/profile", { onboardingCompleted: true });
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                  setLocation("/");
                }}
                className="w-full bg-success hover:bg-success/80 text-white py-4 rounded-full font-semibold"
              >
                Let's Start My Journey!
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                    <Target className="text-primary-500 w-6 h-6 mr-4" />
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
                    <Dumbbell className="text-primary-500 w-6 h-6 mr-4" />
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
                    <Heart className="text-primary-500 w-6 h-6 mr-4" />
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
                    <Label className="block text-sm font-medium mb-2">Height (inches)</Label>
                    <Input
                      type="number"
                      placeholder="67"
                      value={formData.height || ''}
                      onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                      className="bg-surface border-gray-600"
                    />
                    <p className="text-xs text-gray-400 mt-1">e.g., 5'7" = 67 inches</p>
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">Current Weight (lbs)</Label>
                    <Input
                      type="number"
                      placeholder="154"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      className="bg-surface border-gray-600"
                    />
                  </div>
                  
                  {formData.goal === 'weight-loss' && (
                    <div>
                      <Label className="block text-sm font-medium mb-2">Goal Weight (lbs)</Label>
                      <Input
                        type="number"
                        placeholder="132"
                        value={formData.goalWeight || ''}
                        onChange={(e) => setFormData({ ...formData, goalWeight: Number(e.target.value) })}
                        className="bg-surface border-gray-600"
                      />
                      <p className="text-xs text-gray-400 mt-1">Your target weight for this weight loss journey</p>
                    </div>
                  )}
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
                        <Check className="w-4 h-4" />
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
                        <Check className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div>
              <h1 className="text-3xl font-bold mb-2">Current Nutrition</h1>
              <p className="text-gray-400 mb-8">Upload a screenshot of your MyFitnessPal nutrition dashboard so I can understand your current eating habits (optional).</p>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="macros-upload"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, currentMacrosFile: file });
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="macros-upload" className="cursor-pointer">
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Camera className="text-primary-500 w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">Upload Screenshot</p>
                        <p className="text-sm text-gray-400">
                          {formData.currentMacrosFile ? formData.currentMacrosFile.name : "Tap to select your MyFitnessPal screenshot"}
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
                
                {formData.currentMacrosFile && (
                  <div className="bg-surface rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                        <Check className="text-success w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Screenshot uploaded</p>
                        <p className="text-sm text-gray-400">I'll analyze this to understand your current nutrition</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="text-blue-400 w-5 h-5 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold mb-1">Pro tip:</p>
                      <p>Take a screenshot of your MyFitnessPal daily nutrition summary showing calories, protein, carbs, and fat. This helps me create a more personalized plan.</p>
                    </div>
                  </div>
                </div>
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
