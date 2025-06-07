import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

interface UploadResult {
  message: string;
  total: number;
  successful: number;
  errors: number;
  exercises: Array<{
    id: number;
    name: string;
    videoUrl: string;
  }>;
  errorDetails: Array<{
    filename: string;
    error: string;
  }>;
}

export default function ExerciseUpload() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const bulkUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('videos', file);
      });
      
      const response = await fetch('/api/exercises/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data);
      setSelectedFiles(null);
    },
  });

  const singleUploadMutation = useMutation({
    mutationFn: async ({ file, exerciseData }: { file: File; exerciseData: any }) => {
      const formData = new FormData();
      formData.append('gif', file);
      Object.entries(exerciseData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
      
      return apiRequest('/api/exercises', {
        method: 'POST',
        body: formData,
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
    setUploadResult(null);
  };

  const handleBulkUpload = () => {
    if (selectedFiles) {
      bulkUploadMutation.mutate(selectedFiles);
    }
  };

  return (
    <div className="min-h-screen bg-dark p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Exercise GIF Upload</h1>
          <p className="text-gray-400">Upload your 500 exercise demonstration GIFs</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Upload Exercise GIFs
            </CardTitle>
            <CardDescription className="text-gray-400">
              Select multiple GIF files to upload all your exercise demonstrations at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gif-files" className="text-white">
                Select GIF Files
              </Label>
              <Input
                id="gif-files"
                type="file"
                accept=".gif,image/gif"
                multiple
                onChange={handleFileSelect}
                className="bg-gray-700 border-gray-600 text-white file:bg-primary file:text-white file:border-0"
              />
              {selectedFiles && (
                <p className="text-sm text-gray-400 mt-2">
                  {selectedFiles.length} files selected
                </p>
              )}
            </div>

            <Button
              onClick={handleBulkUpload}
              disabled={!selectedFiles || bulkUploadMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {bulkUploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All GIFs
                </>
              )}
            </Button>

            {bulkUploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Processing files...</span>
                  <span>This may take a few minutes</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {uploadResult && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {uploadResult.errors === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-2xl font-bold text-white">{uploadResult.total}</div>
                  <div className="text-sm text-gray-400">Total Files</div>
                </div>
                <div className="bg-green-900/50 p-3 rounded">
                  <div className="text-2xl font-bold text-green-400">{uploadResult.successful}</div>
                  <div className="text-sm text-gray-400">Successful</div>
                </div>
                <div className="bg-red-900/50 p-3 rounded">
                  <div className="text-2xl font-bold text-red-400">{uploadResult.errors}</div>
                  <div className="text-sm text-gray-400">Errors</div>
                </div>
              </div>

              <div className="text-green-400 font-medium">{uploadResult.message}</div>

              {uploadResult.exercises.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2">Sample Uploaded Exercises:</h3>
                  <div className="space-y-2">
                    {uploadResult.exercises.map((exercise) => (
                      <div key={exercise.id} className="bg-gray-700 p-2 rounded flex items-center gap-3">
                        {exercise.videoUrl && (
                          <img 
                            src={exercise.videoUrl} 
                            alt={exercise.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="text-white font-medium">{exercise.name}</div>
                          <div className="text-sm text-gray-400">ID: {exercise.id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadResult.errorDetails.length > 0 && (
                <div>
                  <h3 className="text-red-400 font-medium mb-2">Sample Errors:</h3>
                  <div className="space-y-1">
                    {uploadResult.errorDetails.map((error, index) => (
                      <div key={index} className="bg-red-900/20 p-2 rounded text-sm">
                        <div className="text-red-400">{error.filename}</div>
                        <div className="text-gray-400">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-400 space-y-2">
            <p>• Select all your exercise GIF files (up to 500 at once)</p>
            <p>• File names should describe the exercise (e.g., "push-up.gif", "squat.gif")</p>
            <p>• The system will automatically create exercise entries with basic information</p>
            <p>• You can later edit exercise details, muscle groups, and categories</p>
            <p>• Supported format: GIF files (max 10MB each)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}