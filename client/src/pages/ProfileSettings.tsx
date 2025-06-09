import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProfileSettingsProps {
  onBack: () => void;
}

export default function ProfileSettings({ onBack }: ProfileSettingsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [isCoach, setIsCoach] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      const userData = user as any;
      setFirstName(userData?.firstName || "");
      setLastName(userData?.lastName || "");
      setBio(userData?.bio || "");
      setIsCoach(userData?.id === "coach_chassidy");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; bio?: string; profileImage?: File }) => {
      const formData = new FormData();
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      if (data.bio) formData.append('bio', data.bio);
      if (data.profileImage) formData.append('profileImage', data.profileImage);

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Update failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setSelectedFile(null);
      setPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image under 5MB",
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

  const handleSubmit = () => {
    updateProfileMutation.mutate({
      firstName,
      lastName,
      bio: isCoach ? bio : undefined,
      profileImage: selectedFile || undefined,
    });
  };

  const getCurrentProfileImage = () => {
    if (preview) return preview;
    if (isCoach) return "/chassidy-profile.jpeg";
    return "/john-profile.png";
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Image */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img
                    src={getCurrentProfileImage()}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-600"
                  />
                  <button
                    onClick={() => document.getElementById('profile-image-input')?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-gray-300 mb-2">Update your profile picture</p>
                  <p className="text-sm text-gray-400">JPG, PNG up to 5MB</p>
                  {selectedFile && (
                    <p className="text-sm text-green-400 mt-2">New image selected: {selectedFile.name}</p>
                  )}
                </div>
              </div>
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter last name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coach Bio */}
          {isCoach && (
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Professional Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-gray-300">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white mt-2"
                  placeholder="Tell your clients about your experience and approach..."
                  rows={4}
                />
                <p className="text-sm text-gray-400 mt-2">
                  This will be shown to your clients on the dashboard
                </p>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending || !firstName.trim()}
            className="w-full bg-primary-500 hover:bg-primary-600"
          >
            {updateProfileMutation.isPending ? (
              "Updating..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}