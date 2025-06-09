import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User, Crown, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  goal?: string;
  trainerId?: string;
}

export default function UserSwitcher() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    goal: '',
    isTrainer: false
  });

  // Fetch available users from the database
  const { data: availableUsers = [], isLoading } = useQuery<UserData[]>({
    queryKey: ["/api/auth/available-users"],
  });

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
    onSuccess: (data) => {
      // Set auth token as cookie manually
      if (data.authToken) {
        document.cookie = `auth_token=${data.authToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
        
        // Also store in localStorage as backup
        localStorage.setItem('demo_auth_token', data.authToken);
        localStorage.setItem('demo_user_id', data.userId);
      }
      
      // Force a page reload to ensure the new auth takes effect
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
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
      // Clear localStorage
      localStorage.removeItem('demo_auth_token');
      localStorage.removeItem('demo_user_id');
      
      // Clear cookies
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'connect.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
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
      
      // Force reload to clear auth state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return await apiRequest('POST', '/api/auth/create-user', userData);
    },
    onSuccess: (data) => {
      toast({
        title: "User created successfully",
        description: `${newUserData.firstName} ${newUserData.lastName} has been added to the system`,
      });
      
      // Clear form and hide it
      setNewUserData({
        firstName: '',
        lastName: '',
        email: '',
        goal: '',
        isTrainer: false
      });
      setShowCreateForm(false);
      
      // Refresh the users list
      queryClient.invalidateQueries({ queryKey: ["/api/auth/available-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "An error occurred while creating the user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserData.firstName || !newUserData.lastName || !newUserData.email) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createUserMutation.mutate(newUserData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Choose Account</h1>
          <p className="text-gray-600">Select which account you'd like to access</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading available accounts...</p>
          </div>
        ) : availableUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No accounts available</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableUsers.map((user) => {
              const isTrainer = user.id === 'coach_chassidy' || user.trainerId === null;
              const userType = isTrainer ? 'Trainer' : 'Client';
              const borderColor = isTrainer ? 'hover:border-purple-300' : 'hover:border-blue-300';
              const buttonColor = isTrainer ? 'bg-purple-600 hover:bg-purple-700' : '';
              
              return (
                <Card 
                  key={user.id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer border-2 ${borderColor}`}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto h-20 w-20 mb-4 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {user.profileImageUrl ? (
                        <img 
                          src={user.profileImageUrl} 
                          alt={`${user.firstName} ${user.lastName}`} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          {isTrainer ? (
                            <Crown className="w-8 h-8 text-white" />
                          ) : (
                            <User className="w-8 h-8 text-white" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="flex items-center justify-center gap-2">
                        {user.firstName} {user.lastName}
                        {isTrainer && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            {userType}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {isTrainer 
                          ? "Personal trainer managing client programs and progress"
                          : user.goal || "Fitness client working towards their goals"
                        }
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className={`w-full ${buttonColor}`}
                      onClick={() => window.location.href = `/api/auth/switch/${user.id}`}
                    >
                      Login as {user.firstName}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create New User Section */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New User
            </CardTitle>
            <CardDescription>
              Create a new client or trainer account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showCreateForm ? (
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Account
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <Label htmlFor="userType">Account Type</Label>
                  <Select 
                    value={newUserData.isTrainer ? 'trainer' : 'client'} 
                    onValueChange={(value) => setNewUserData(prev => ({ ...prev, isTrainer: value === 'trainer' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="trainer">Trainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!newUserData.isTrainer && (
                  <div>
                    <Label htmlFor="goal">Fitness Goal</Label>
                    <Textarea
                      id="goal"
                      value={newUserData.goal}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, goal: e.target.value }))}
                      placeholder="Enter fitness goals (optional)"
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateUser}
                    disabled={createUserMutation.isPending}
                    className="flex-1"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create Account'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewUserData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        goal: '',
                        isTrainer: false
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="border-gray-300 text-gray-900 bg-white hover:bg-gray-100 hover:border-gray-400 font-medium"
          >
            {logoutMutation.isPending ? 'Logging out...' : 'Logout Current User'}
          </Button>
        </div>
      </div>
    </div>
  );
}