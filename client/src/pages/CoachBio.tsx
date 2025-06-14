import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Trainer {
  id: string;
  name: string;
  photoUrl?: string;
  bio: string;
  specialties: string[];
  certifications: string[];
  isActive: boolean;
}

export default function CoachBio() {
  const { data: trainer, isLoading } = useQuery<Trainer | null>({
    queryKey: ['/api/trainer/coach_chassidy'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600">
            <img 
              src={trainer?.photoUrl || "/attached_assets/CE Bio Image_1749399911915.jpeg"} 
              alt={trainer?.name || "Coach Chassidy"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials if photo doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-white">CH</div>';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{trainer?.name || "Coach Chassidy"}</h1>
          <p className="text-primary-400 text-lg">Certified Personal Trainer & Nutrition Coach</p>
        </div>

        {/* Bio Content */}
        <div className="space-y-6">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">About Coach Chassidy</h2>
              {trainer?.bio && (
                <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {trainer.bio}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specialties */}
          {trainer?.specialties && trainer.specialties.length > 0 && (
            <Card className="bg-surface border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">My Specialties</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {trainer.specialties.map((specialty, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-gray-300">{specialty}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {trainer?.certifications && trainer.certifications.length > 0 && (
            <Card className="bg-surface border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Certifications</h2>
                <div className="flex flex-wrap gap-2">
                  {trainer.certifications.map((cert, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-sm"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


        </div>

        {/* Close Button */}
        <div className="mt-8 text-center">
          <Button 
            onClick={() => window.close()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}