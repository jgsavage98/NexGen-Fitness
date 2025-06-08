import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DailyMacros {
  id: number;
  userId: string;
  date: string;
  screenshotUrl?: string;
  extractedCalories?: number;
  extractedProtein?: number;
  extractedCarbs?: number;
  extractedFat?: number;
  visionConfidence?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  adherenceScore?: number;
  hungerLevel?: number;
  energyLevel?: number;
  notes?: string;
}

interface ScreenshotUploadResult {
  success: boolean;
  extraction: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
    extractedText?: string;
    error?: string;
  };
  dailyMacros: DailyMacros;
  message: string;
}

export default function ScreenshotUploadTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hungerLevel, setHungerLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  // Get today's macros
  const { data: todaysMacros, isLoading } = useQuery({
    queryKey: ['/api/nutrition/daily', today],
    retry: false,
  });

  // Upload screenshot mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; hungerLevel: number; energyLevel: number; notes: string; date: string }) => {
      const formData = new FormData();
      formData.append('screenshot', data.file);
      formData.append('hungerLevel', data.hungerLevel.toString());
      formData.append('energyLevel', data.energyLevel.toString());
      formData.append('notes', data.notes);
      formData.append('date', data.date);

      const response = await fetch('/api/nutrition/screenshot', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json() as Promise<ScreenshotUploadResult>;
    },
    onSuccess: (result) => {
      toast({
        title: "Screenshot Processed!",
        description: `Extracted ${result.extraction.calories} calories with ${Math.round(result.extraction.confidence * 100)}% confidence`,
      });
      
      // Clear form
      setSelectedFile(null);
      setPreview(null);
      setNotes("");
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/daily'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image under 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    
    uploadMutation.mutate({
      file: selectedFile,
      hungerLevel,
      energyLevel,
      notes,
      date: today,
    });
  };

  const getStatusIcon = () => {
    if (todaysMacros?.screenshotUrl) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (uploadMutation.isPending) {
      return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
    return <AlertCircle className="w-5 h-5 text-orange-500" />;
  };

  const getStatusMessage = () => {
    if (todaysMacros?.screenshotUrl) {
      return "Today's nutrition logged successfully";
    }
    if (uploadMutation.isPending) {
      return "Processing screenshot...";
    }
    return "Upload your MyFitnessPal screenshot";
  };

  const calculateAdherence = () => {
    if (!todaysMacros?.extractedCalories || !todaysMacros?.targetCalories) return 0;
    
    const calorieAdherence = Math.max(0, 100 - Math.abs(todaysMacros.extractedCalories - todaysMacros.targetCalories) / todaysMacros.targetCalories * 100);
    return Math.round(calorieAdherence);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Daily Nutrition</h1>
        <p className="text-gray-400">Upload your MyFitnessPal screenshot</p>
      </div>

      {/* Status Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="text-white font-medium">{getStatusMessage()}</p>
              <p className="text-sm text-gray-400">
                {todaysMacros?.extractedCalories 
                  ? `${todaysMacros.extractedCalories} calories logged` 
                  : "No data for today"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Progress */}
      {todaysMacros?.extractedCalories && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Today's Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{todaysMacros.extractedCalories}</p>
                <p className="text-sm text-gray-400">Calories</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{calculateAdherence()}%</p>
                <p className="text-sm text-gray-400">Adherence</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-white">{todaysMacros.extractedProtein}g</p>
                <p className="text-xs text-gray-400">Protein</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{todaysMacros.extractedCarbs}g</p>
                <p className="text-xs text-gray-400">Carbs</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{todaysMacros.extractedFat}g</p>
                <p className="text-xs text-gray-400">Fat</p>
              </div>
            </div>

            {todaysMacros.visionConfidence && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-300">
                  Vision Confidence: {Math.round(todaysMacros.visionConfidence * 100)}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Upload Screenshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-gray-300">MyFitnessPal Screenshot</Label>
            <div 
              className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="space-y-2">
                  <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded" />
                  <p className="text-sm text-gray-400">{selectedFile?.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-gray-400">Tap to select screenshot</p>
                  <p className="text-xs text-gray-500">JPG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Feedback Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Hunger Level</Label>
              <Input
                type="range"
                min="1"
                max="5"
                value={hungerLevel}
                onChange={(e) => setHungerLevel(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Very Low</span>
                <span className="text-primary font-medium">{hungerLevel}/5</span>
                <span>Very High</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Energy Level</Label>
              <Input
                type="range"
                min="1"
                max="5"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Very Low</span>
                <span className="text-primary font-medium">{energyLevel}/5</span>
                <span>Very High</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-gray-300">Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did you feel today? Any cravings or challenges?"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {uploadMutation.isPending ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Coach Message */}
      <Card className="bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <img 
              src="/coach-chassidy.jpg" 
              alt="Coach Chassidy"
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
            />
            <div>
              <p className="text-white font-medium mb-1">Coach Chassidy</p>
              <p className="text-gray-300 text-sm">
                Upload your daily MyFitnessPal screenshot by 8 PM for macro tracking. 
                I'll review your progress and adjust your targets as needed!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}