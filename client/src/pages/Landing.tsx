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
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-fire text-white text-2xl"></i>
          </div>
          <h1 className="text-4xl font-bold mb-4">Ignite AI</h1>
          <p className="text-gray-400 text-lg">Your 24/7 AI Fitness Coach</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-12">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                  <i className="fas fa-robot text-white"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI-Powered Coaching</h3>
                  <p className="text-gray-400 text-sm">Get personalized guidance 24/7</p>
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
                  <h3 className="font-semibold text-white">Smart Workouts</h3>
                  <p className="text-gray-400 text-sm">Adaptive plans that evolve with you</p>
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
                  <h3 className="font-semibold text-white">Nutrition Tracking</h3>
                  <p className="text-gray-400 text-sm">Macro tracking made simple</p>
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
            Join thousands of users transforming their fitness journey
          </p>
        </div>
      </div>
    </div>
  );
}
