import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, X, Camera, Check, Info, Dumbbell, Target, Heart, Calendar } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface OnboardingData {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: File;
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

interface NutritionExtraction {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  extractedText?: string;
  error?: string;
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [macroSummary, setMacroSummary] = useState<any>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionExtraction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const totalSteps = 7;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleProfileImageUpload = (file: File) => {
    setFormData({ ...formData, profileImage: file });
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (file: File) => {
    setFormData({ ...formData, currentMacrosFile: file });
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze nutrition data
    setIsAnalyzing(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('screenshot', file);
      
      // Add auth parameter from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const authParam = urlParams.get('auth');
      let url = '/api/nutrition/extract';
      if (authParam) {
        url += `?auth=${authParam}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Nutrition extraction response:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.protein !== undefined) {
          setNutritionData(data);
          toast({
            title: "Screenshot analyzed",
            description: `Found ${data.calories} calories with ${data.protein}g protein`,
          });
        } else {
          throw new Error('No nutrition data found in screenshot');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Failed to analyze screenshot (${response.status})`);
      }
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      toast({
        title: "Analysis failed",
        description: "Could not extract nutrition data. You can continue without it.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      // First upload profile image if provided
      let profileImageUrl = null;
      if (data.profileImage) {
        const formData = new FormData();
        formData.append('profileImage', data.profileImage);
        
        const urlParams = new URLSearchParams(window.location.search);
        const authParam = urlParams.get('auth');
        let uploadUrl = '/api/user/profile-image';
        if (authParam) {
          uploadUrl += `?auth=${authParam}`;
        }
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          profileImageUrl = uploadData.profileImageUrl;
        }
      }
      
      // Convert string values to numbers where needed
      const profileData = {
        ...data,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        profileImageUrl: profileImageUrl,
        goal: data.goal, // Keep goal as string (weight-loss, muscle-gain, maintenance)
        weight: data.weight ? parseFloat(data.weight.toString()) : undefined,
        goalWeight: data.goalWeight ? parseFloat(data.goalWeight.toString()) : undefined,
        height: data.height ? parseInt(data.height.toString()) : undefined,
        age: data.age ? parseInt(data.age.toString()) : undefined,
        onboardingCompleted: false, // Don't mark as completed yet - wait for user acknowledgment
      };
      
      // Remove the file objects from the data being sent to the API
      delete profileData.profileImage;
      delete profileData.currentMacrosFile;
      
      // Update the profile
      const profileResponse = await apiRequest("PUT", "/api/user/profile", profileData);
      
      // Note: Macro summary will be calculated in onSuccess after profile update
      
      return profileResponse.json();
    },
    onSuccess: (data) => {
      console.log('Onboarding complete response:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Calculate macro summary based on whether we have nutrition data
      let baselineData;
      let newCalories;
      
      if (nutritionData && formData.currentMacrosFile) {
        // Use extracted nutrition data from screenshot
        baselineData = {
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs,
          fat: nutritionData.fat
        };
        newCalories = Math.max(baselineData.calories - 50, 1200);
        console.log('Using extracted nutrition data for macro summary:', baselineData);
      } else {
        // Use standard baseline values if no screenshot was uploaded
        baselineData = { calories: 2000, protein: 120, carbs: 200, fat: 65 };
        newCalories = Math.max(baselineData.calories - 50, 1200);
        console.log('Using standard baseline for macro summary (no screenshot):', baselineData);
      }
      
      // Calculate new macros based on baseline data
      let newMacros;
      if (nutritionData && formData.currentMacrosFile) {
        // For extracted data, reduce calories by adjusting fat and carbs
        const calorieReduction = baselineData.calories - newCalories; // 50 calories
        const fatReduction = Math.round(calorieReduction * 0.6 / 9); // ~3g fat (30 cal)
        const carbReduction = Math.round(calorieReduction * 0.4 / 4); // ~5g carbs (20 cal)
        
        newMacros = {
          protein: baselineData.protein, // Keep protein the same
          carbs: Math.max(baselineData.carbs - carbReduction, 50),
          fat: Math.max(baselineData.fat - fatReduction, 20)
        };
      } else {
        // Use percentage-based calculation for standard baseline
        newMacros = { 
          protein: Math.round(newCalories * 0.25 / 4), 
          carbs: Math.round(newCalories * 0.45 / 4), 
          fat: Math.round(newCalories * 0.30 / 9) 
        };
      }

      const macroData = {
        baselineCalories: baselineData.calories,
        newCalories,
        baselineMacros: { 
          protein: baselineData.protein, 
          carbs: baselineData.carbs, 
          fat: baselineData.fat 
        },
        newMacros
      };
      
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
        return !!(formData.firstName && formData.lastName && formData.email);
      case 2:
        return !!formData.goal;
      case 3:
        const basicInfoComplete = !!(formData.height && formData.weight && formData.age && formData.gender);
        const goalWeightRequired = formData.goal === 'weight-loss' ? !!formData.goalWeight : true;
        return basicInfoComplete && goalWeightRequired;
      case 4:
        return !!formData.activityLevel;
      case 5:
        return true; // Injuries are optional
      case 6:
        return true; // Equipment is optional
      case 7:
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

          {/* Next Steps */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-300 mb-2">Your Plan is Being Created</h3>
                  <p className="text-gray-300 mb-4">
                    Coach Chassidy will review all the information you've provided, including your MyFitnessPal baseline data, 
                    goals, and preferences to create your personalized macro plan.
                  </p>
                  <div className="bg-primary-500/10 rounded-lg p-4">
                    <h4 className="font-medium text-primary-200 mb-2">You'll be notified when:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Your macro targets are ready</li>
                      <li>• Your workout plan is available</li>
                      <li>• Coach Chassidy has any questions</li>
                    </ul>
                  </div>
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
                  Welcome to your personalized fitness journey! I've received all your information and MyFitnessPal baseline data. 
                  I'll now create your custom macro plan and workout routine tailored specifically to your goals and preferences. 
                  You'll receive a notification in the app once everything is ready!
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="mt-auto">
            <div className="space-y-4">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                <p className="text-sm text-primary-200">
                  Your information has been submitted successfully. Coach Chassidy will review everything and create your personalized plan.
                </p>
              </div>
              <Button
                onClick={async () => {
                  // Mark onboarding as truly completed and go to dashboard
                  await apiRequest("PUT", "/api/user/profile", { onboardingCompleted: true });
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                  setLocation("/");
                }}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-full font-semibold"
              >
                Continue to Dashboard
              </Button>
            </div>
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
                className="text-gray-300 hover:text-white hover:bg-gray-700 text-xs font-medium"
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
              <h1 className="text-3xl font-bold mb-2">Let's get to know you</h1>
              <p className="text-gray-400 mb-8">Tell us about yourself so we can personalize your experience.</p>
              
              <div className="space-y-6">
                {/* Profile Image Upload */}
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-24 h-24 mx-auto mb-4 relative">
                      {profileImagePreview ? (
                        <img 
                          src={profileImagePreview} 
                          alt="Profile preview" 
                          className="w-24 h-24 rounded-full object-cover border-2 border-primary-500"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      id="profile-image"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleProfileImageUpload(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="profile-image" className="cursor-pointer">
                      <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500/20 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors">
                        <Camera className="w-4 h-4" />
                        <span className="text-sm">Add Photo (Optional)</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-surface border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-surface border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-surface border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
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

          {currentStep === 3 && (
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

          {currentStep === 4 && (
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

          {currentStep === 5 && (
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

          {currentStep === 6 && (
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

          {currentStep === 7 && (
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
                        handleImageUpload(file);
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
                  <div className="space-y-4">
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="bg-surface rounded-lg p-4">
                        <p className="font-semibold mb-3">Screenshot Preview</p>
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Nutrition screenshot preview" 
                            className="w-full h-48 object-contain rounded-lg border border-gray-600 bg-gray-800"
                          />
                          {isAnalyzing && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <div className="flex items-center space-x-2 text-white">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="text-sm">Analyzing nutrition data...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Nutrition Data Results */}
                    {nutritionData && (
                      <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                            <Check className="text-success w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold">Nutrition data extracted</p>
                            <p className="text-sm text-gray-400">Your current baseline from MyFitnessPal</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="text-center bg-gray-800 rounded-lg p-3">
                            <div className="text-xl font-bold text-success">{nutritionData.calories}</div>
                            <div className="text-sm text-gray-400">Calories</div>
                          </div>
                          <div className="text-center bg-gray-800 rounded-lg p-3">
                            <div className="text-xl font-bold text-blue-400">{nutritionData.protein}g</div>
                            <div className="text-sm text-gray-400">Protein</div>
                          </div>
                          <div className="text-center bg-gray-800 rounded-lg p-3">
                            <div className="text-xl font-bold text-yellow-400">{nutritionData.carbs}g</div>
                            <div className="text-sm text-gray-400">Carbs</div>
                          </div>
                          <div className="text-center bg-gray-800 rounded-lg p-3">
                            <div className="text-xl font-bold text-purple-400">{nutritionData.fat}g</div>
                            <div className="text-sm text-gray-400">Fat</div>
                          </div>
                        </div>
                        
                        {nutritionData.confidence < 0.8 && (
                          <div className="mt-3 text-sm text-yellow-300">
                            <Info className="w-4 h-4 inline mr-1" />
                            Low confidence extraction - please verify the numbers look correct
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fallback success message if no nutrition data */}
                    {!nutritionData && !isAnalyzing && (
                      <div className="bg-surface rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                            <Check className="text-success w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold">Screenshot uploaded</p>
                            <p className="text-sm text-gray-400">I'll use standard baseline values for your plan</p>
                          </div>
                        </div>
                      </div>
                    )}
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
