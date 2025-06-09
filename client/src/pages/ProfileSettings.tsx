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
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [clientsHelped, setClientsHelped] = useState(0);
  const [rating, setRating] = useState(0.0);
  const [isCoach, setIsCoach] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch trainer data if user is a coach
  const { data: trainerData } = useQuery({
    queryKey: ["/api/trainer/profile"],
    enabled: (user as any)?.id === "coach_chassidy",
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      const userData = user as any;
      setFirstName(userData?.firstName || "");
      setLastName(userData?.lastName || "");
      setIsCoach(userData?.id === "coach_chassidy");
      
      // Use trainer bio if user is a coach, otherwise use user bio
      if (userData?.id === "coach_chassidy" && trainerData) {
        setBio((trainerData as any).bio || "");
        setSpecialties((trainerData as any).specialties || []);
        setCertifications((trainerData as any).certifications || []);
        setYearsExperience((trainerData as any).yearsExperience || 0);
        setClientsHelped((trainerData as any).clientsHelped || 0);
        setRating((trainerData as any).rating || 0.0);
      } else {
        setBio(userData?.bio || "");
        setSpecialties([]);
        setCertifications([]);
        setYearsExperience(0);
        setClientsHelped(0);
        setRating(0.0);
      }
    }
  }, [user, trainerData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { 
      firstName: string; 
      lastName: string; 
      bio?: string; 
      specialties?: string[]; 
      certifications?: string[];
      yearsExperience?: number;
      clientsHelped?: number;
      rating?: number;
      profileImage?: File 
    }) => {
      const formData = new FormData();
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      if (data.bio) formData.append('bio', data.bio);
      if (data.specialties) formData.append('specialties', JSON.stringify(data.specialties));
      if (data.certifications) formData.append('certifications', JSON.stringify(data.certifications));
      if (data.yearsExperience !== undefined) formData.append('yearsExperience', data.yearsExperience.toString());
      if (data.clientsHelped !== undefined) formData.append('clientsHelped', data.clientsHelped.toString());
      if (data.rating !== undefined) formData.append('rating', data.rating.toString());
      if (data.profileImage) formData.append('profileImage', data.profileImage);

      // Use trainer-specific endpoint if user is a coach
      const endpoint = isCoach ? '/api/trainer/update-profile' : '/api/profile/update';
      const response = await fetch(endpoint, {
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
      if (isCoach) {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/profile"] });
      }
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
      specialties: isCoach ? specialties : undefined,
      certifications: isCoach ? certifications : undefined,
      yearsExperience: isCoach ? yearsExperience : undefined,
      clientsHelped: isCoach ? clientsHelped : undefined,
      rating: isCoach ? rating : undefined,
      profileImage: selectedFile || undefined,
    });
  };

  const addSpecialty = () => {
    setSpecialties([...specialties, ""]);
  };

  const updateSpecialty = (index: number, value: string) => {
    const updated = [...specialties];
    updated[index] = value;
    setSpecialties(updated);
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const addCertification = () => {
    setCertifications([...certifications, ""]);
  };

  const updateCertification = (index: number, value: string) => {
    const updated = [...certifications];
    updated[index] = value;
    setCertifications(updated);
  };

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
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
                <Label className="text-gray-300">About Coach Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white mt-2"
                  placeholder="Tell your clients about your experience and approach..."
                  rows={6}
                />
                <p className="text-sm text-gray-400 mt-2">
                  This will be shown to your clients on the "Meet Your Coach" page
                </p>
              </CardContent>
            </Card>
          )}

          {/* Coach Specialties */}
          {isCoach && (
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">My Specialties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {specialties.map((specialty, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      value={specialty}
                      onChange={(e) => updateSpecialty(index, e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white flex-1"
                      placeholder="Enter a specialty area..."
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpecialty(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSpecialty}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  + Add Specialty
                </Button>
                <p className="text-sm text-gray-400">
                  List your areas of expertise and specialization
                </p>
              </CardContent>
            </Card>
          )}

          {/* Coach Stats */}
          {isCoach && (
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Professional Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Years Experience</Label>
                    <Input
                      type="number"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600 text-white mt-2"
                      placeholder="8"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Clients Helped</Label>
                    <Input
                      type="number"
                      value={clientsHelped}
                      onChange={(e) => setClientsHelped(parseInt(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600 text-white mt-2"
                      placeholder="500"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Rating</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={rating}
                      onChange={(e) => setRating(parseFloat(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600 text-white mt-2"
                      placeholder="4.9"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  These stats will be displayed on your coach profile
                </p>
              </CardContent>
            </Card>
          )}

          {/* Coach Certifications */}
          {isCoach && (
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Certifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {certifications.map((certification, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      value={certification}
                      onChange={(e) => updateCertification(index, e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white flex-1"
                      placeholder="e.g., NASM-CPT"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCertification(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCertification}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  + Add Certification
                </Button>
                <p className="text-sm text-gray-400">
                  List your professional certifications and credentials
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