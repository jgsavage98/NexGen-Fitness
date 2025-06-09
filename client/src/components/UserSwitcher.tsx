import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import johnProfileImage from "@assets/John_1749433573534.png";

export default function UserSwitcher() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user query to refresh auth state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Switched accounts",
        description: "Successfully switched to the selected account",
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Logged out",
        description: "Successfully logged out",
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Choose Account</h1>
          <p className="text-gray-600">Select which account you'd like to access</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Demo User Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300">
            <CardHeader className="text-center">
              <div className="mx-auto h-20 w-20 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <img src={johnProfileImage} alt="John" className="h-16 w-16 rounded-full object-cover" />
              </div>
              <CardTitle>John (Demo User)</CardTitle>
              <CardDescription>
                Fitness client working towards weight loss goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => loginMutation.mutate('demo-user-123')}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Switching...' : 'Login as John'}
              </Button>
            </CardContent>
          </Card>

          {/* Coach Chassidy Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-300">
            <CardHeader className="text-center">
              <div className="mx-auto h-20 w-20 mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-lg font-semibold text-purple-700">CC</span>
              </div>
              <CardTitle>Coach Chassidy</CardTitle>
              <CardDescription>
                Personal trainer managing client programs and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={() => loginMutation.mutate('coach_chassidy')}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Switching...' : 'Login as Coach'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? 'Logging out...' : 'Logout Current User'}
          </Button>
        </div>
      </div>
    </div>
  );
}