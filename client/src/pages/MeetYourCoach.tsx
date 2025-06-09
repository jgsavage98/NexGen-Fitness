import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, Users, Star } from "lucide-react";
import { Link } from "wouter";

interface Trainer {
  id: string;
  name: string;
  photoUrl?: string;
  bio: string;
  specialties: string[];
  certifications: string[];
  yearsExperience: number;
  clientsHelped: number;
  rating: number;
  isActive: boolean;
}

export default function MeetYourCoach() {
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
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-800">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="ml-3 text-lg font-semibold">Meet Your Coach</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Hero Photo */}
          <div className="relative">
            <div className="w-full h-80 rounded-2xl overflow-hidden bg-gradient-to-b from-primary/20 to-purple-600/20">
              <img
                src={trainer?.photoUrl || "/coach-chassidy.jpg"}
                alt={trainer?.name || "Coach Chassidy"}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {trainer?.name || "Coach Chassidy"}
                </h2>
                <p className="text-gray-200 font-medium">Your Personal Trainer & Nutrition Coach</p>
              </div>
            </div>
          </div>

          {/* Credentials */}
          {trainer?.certifications && trainer.certifications.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Award className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-white">Certifications</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trainer.certifications.map((cert, index) => (
                    <Badge key={index} variant="secondary" className="bg-gray-700 text-gray-200 border-gray-600">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {trainer?.yearsExperience ? `${trainer.yearsExperience}+` : '8+'}
                </div>
                <div className="text-xs text-gray-400">Years Experience</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {trainer?.clientsHelped ? `${trainer.clientsHelped}+` : '500+'}
                </div>
                <div className="text-xs text-gray-400">Clients Helped</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {trainer?.rating ? trainer.rating.toFixed(1) : '4.9'}
                </div>
                <div className="text-xs text-gray-400">
                  <div className="flex items-center justify-center space-x-1">
                    <Star className="w-3 h-3 fill-current text-yellow-400" />
                    <span>Rating</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bio */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-white">About Coach Chassidy</h3>
              </div>
              <div className="text-gray-300 text-sm leading-relaxed">
                {trainer?.bio && (
                  <div className="whitespace-pre-line">
                    {trainer.bio}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          {trainer?.specialties && trainer.specialties.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">My Specialties</h3>
                <div className="space-y-2">
                  {trainer.specialties.map((specialty, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-gray-300 text-sm">{specialty}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <div className="pb-8">
            <Link href="/">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3">
                Start My Program
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}