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
  certifications: string[];
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
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {trainer?.name || "Coach Chassidy"}
                </h2>
                <p className="text-primary font-medium">Your Personal Trainer & Nutrition Coach</p>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-white">Certifications</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(trainer?.certifications || ["NASM-CPT", "Precision Nutrition Level 1", "NSCA-CSCS"]).map((cert) => (
                  <Badge key={cert} variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    {cert}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">8+</div>
                <div className="text-xs text-gray-400">Years Experience</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">500+</div>
                <div className="text-xs text-gray-400">Clients Helped</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">4.9</div>
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
              <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                <p>
                  {trainer?.bio || `Certified personal trainer and nutrition specialist with 8+ years of experience helping clients achieve sustainable fitness and nutrition goals. I specialize in evidence-based coaching approaches and lifestyle transformations.`}
                </p>
                <p>
                  I believe in creating personalized programs that fit your lifestyle and help you build lasting healthy habits. My approach focuses on sustainable changes that you can maintain long-term, not quick fixes that leave you feeling frustrated.
                </p>
                <p>
                  When I'm not coaching, you can find me trying new recipes, hiking with my dog, or staying up to date on the latest nutrition research. I'm excited to be part of your journey to better health!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3">My Specialties</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-gray-300 text-sm">Sustainable weight management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-gray-300 text-sm">Macro-based nutrition coaching</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-gray-300 text-sm">Strength training programming</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-gray-300 text-sm">Habit formation & lifestyle coaching</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-gray-300 text-sm">Injury-friendly modifications</span>
                </div>
              </div>
            </CardContent>
          </Card>

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