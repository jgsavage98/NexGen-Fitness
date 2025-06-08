import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CoachBio() {
  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600">
            <img 
              src="/coach-chassidy-photo.jpg" 
              alt="Coach Chassidy"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials if photo doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-white">CH</div>';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Coach Chassidy</h1>
          <p className="text-primary-400 text-lg">Certified Personal Trainer & Nutrition Coach</p>
        </div>

        {/* Bio Content */}
        <div className="space-y-6">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">About Coach Chassidy</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                With over 8 years of experience in fitness and nutrition coaching, Coach Chassidy specializes in 
                personalized macro tracking and sustainable lifestyle transformations. She holds certifications 
                from NASM (National Academy of Sports Medicine) and Precision Nutrition.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Chassidy's approach focuses on precision macro coaching, helping clients achieve their goals 
                through data-driven nutrition strategies and customized workout programs tailored to individual 
                needs and preferences.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Specializations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-chart-line text-white text-sm"></i>
                  </div>
                  <span className="text-gray-300">Macro Tracking & Analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                    <i className="fas fa-dumbbell text-white text-sm"></i>
                  </div>
                  <span className="text-gray-300">Strength Training</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center">
                    <i className="fas fa-heart text-white text-sm"></i>
                  </div>
                  <span className="text-gray-300">Body Composition</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-users text-white text-sm"></i>
                  </div>
                  <span className="text-gray-300">Lifestyle Coaching</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Certifications</h2>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center space-x-2">
                  <i className="fas fa-certificate text-primary-400"></i>
                  <span>NASM Certified Personal Trainer (NASM-CPT)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <i className="fas fa-certificate text-primary-400"></i>
                  <span>Precision Nutrition Level 1 Certified</span>
                </li>
                <li className="flex items-center space-x-2">
                  <i className="fas fa-certificate text-primary-400"></i>
                  <span>Corrective Exercise Specialist (NASM-CES)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
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