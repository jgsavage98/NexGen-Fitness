import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-md mx-auto px-6 py-8 h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-12 pt-16">
          <div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            <img 
              src="/ignite-logo.png" 
              alt="Ignite Logo"
              className="w-full h-full object-contain filter brightness-110"
              onError={(e) => {
                console.log('Logo failed to load, showing fallback');
                e.currentTarget.outerHTML = '<div class="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto">I</div>';
              }}
            />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-white">Ignite</h1>
          <p className="text-gray-400 text-lg">Premium Personal Training & Nutrition Coaching</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-12">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                  <i className="fas fa-user-tie text-white"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Personal Coaching</h3>
                  <p className="text-gray-400 text-sm">Work directly with Coach Chassidy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center">
                  <i className="fas fa-dumbbell text-white"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Custom Workouts</h3>
                  <p className="text-gray-400 text-sm">Personalized plans designed for you</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-warning rounded-full flex items-center justify-center">
                  <i className="fas fa-utensils text-white"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Macro Coaching</h3>
                  <p className="text-gray-400 text-sm">Precision macro tracking and adjustments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <Button 
            onClick={handleLogin}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-full text-lg font-semibold"
          >
            Get Started
          </Button>
          <p className="text-center text-gray-400 text-sm mt-4">
            Start your personalized fitness journey with Coach Chassidy
          </p>
        </div>
      </div>
    </div>
  );
}
