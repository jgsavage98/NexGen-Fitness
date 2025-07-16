import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, MessageSquare, TrendingUp, Dumbbell, Settings, LogOut, Bell, BarChart3, Heart, Zap, Target, Users, Brain } from "lucide-react";
import ProfileSettings from "@/pages/ProfileSettings";
import ClientUploadHistory from "@/components/ClientUploadHistory";
import ClientProgressTimeSeries from "@/components/ClientProgressTimeSeries";
import UnifiedChatTab from "@/components/UnifiedChatTab";
import ExerciseManagement from "@/components/ExerciseManagement";
import AISettings from "@/pages/AISettings";
import TrainerTabNavigation, { TrainerTabType } from "@/components/TrainerTabNavigation";
import { calculateJourneyDay } from "@/lib/dateUtils";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  goal: string;
  weight: number;
  goalWeight: number;
  programStartDate: string;
  onboardingCompleted: boolean;
  unansweredCount?: number;
}

interface PendingMacroChange {
  id: number;
  userId: string;
  date: string;
  proposedCalories: number;
  proposedProtein: number;
  proposedCarbs: number;
  proposedFat: number;
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
  reasoning: string;
  requestDate: string;
  screenshotUrl: string;
  user: Client;
}

interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  createdAt: string;
  user: Client;
}

export default function TrainerDashboard() {
  const [activeTab, setActiveTab] = useState<TrainerTabType>('overview');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [trainerNotes, setTrainerNotes] = useState("");
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const [activityClientFilter, setActivityClientFilter] = useState<string>("all");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if current user is authenticated
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trainer dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is authorized (coach_chassidy)
  if (!currentUser || currentUser.id !== 'coach_chassidy') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="text-gray-400 mt-2">Only Coach Chassidy can access this dashboard</p>
        </div>
      </div>
    );
  }

  // Force cache invalidation on component mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/trainer/pending-macro-changes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
  }, [queryClient]);

  // Fetch all clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  // Fetch pending macro changes
  const { data: pendingChanges = [] } = useQuery<PendingMacroChange[]>({
    queryKey: ["/api/trainer/pending-macro-changes"],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Fetch recent chat messages
  const { data: recentChats = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/trainer/recent-chats"],
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // Fetch recent uploads
  const { data: recentUploads = [] } = useQuery({
    queryKey: ["/api/trainer/recent-uploads"],
    refetchInterval: 3000,
  });

  // Fetch recent weight entries
  const { data: recentWeightEntries = [] } = useQuery({
    queryKey: ["/api/trainer/recent-weight-entries"],
    refetchInterval: 3000,
  });

  // Fetch group chat unread count
  const { data: groupChatUnread = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/trainer/group-chat-unread"],
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  // Debug logging for pending changes
  useEffect(() => {
    if (pendingChanges.length > 0) {
      console.log("Pending changes data received:", pendingChanges);
    }
  }, [pendingChanges]);

  // Notification effect for new pending macro changes
  useEffect(() => {
    if (pendingChanges.length > previousPendingCount && previousPendingCount > 0) {
      const newCount = pendingChanges.length - previousPendingCount;
      
      toast({
        title: "New Macro Review Required",
        description: `${newCount} new client macro plan${newCount > 1 ? 's' : ''} need${newCount === 1 ? 's' : ''} your review`,
        duration: 10000,
      });

      // Browser notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Ignite AI - Macro Review Required', {
            body: `${newCount} new client macro plan${newCount > 1 ? 's' : ''} need${newCount === 1 ? 's' : ''} your review`,
            icon: '/ignite-logo.png',
            tag: 'macro-review'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Ignite AI - Macro Review Required', {
                body: `${newCount} new client macro plan${newCount > 1 ? 's' : ''} need${newCount === 1 ? 's' : ''} your review`,
                icon: '/ignite-logo.png',
                tag: 'macro-review'
              });
            }
          });
        }
      }
    }
    
    setPreviousPendingCount(pendingChanges.length);
  }, [pendingChanges.length, previousPendingCount, toast]);

  // Approve macro change mutation
  const approveMacroMutation = useMutation({
    mutationFn: async ({ changeId, notes }: { changeId: number; notes?: string }) => {
      const response = await apiRequest("POST", `/api/trainer/approve-macro-change/${changeId}`, {
        trainerNotes: notes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/pending-macro-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/recent-chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/recent-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/recent-weight-entries"] });
      toast({
        title: "Success",
        description: "Macro change approved successfully",
      });
      setTrainerNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve macro change",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('demo_auth_token');
      localStorage.removeItem('demo_user_id');
      localStorage.removeItem('url_auth_token');
      
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
      
      setTimeout(() => {
        window.location.href = '/';
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

  // Handler functions
  const handleApproveMacroChange = (changeId: number, notes?: string) => {
    approveMacroMutation.mutate({ changeId, notes });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleShowProfileSettings = () => {
    setShowProfileSettings(true);
  };

  const handleHideProfileSettings = () => {
    setShowProfileSettings(false);
  };

  const handleChatWithClient = (clientId: string) => {
    setSelectedClient(clientId);
    setActiveTab('chat');
  };

  const handleViewClientProgress = (clientId: string) => {
    setSelectedClient(clientId);
    setActiveTab('client-progress');
  };

  // Show profile settings modal
  if (showProfileSettings) {
    return (
      <ProfileSettings 
        onBack={handleHideProfileSettings}
      />
    );
  }

  // Filter activity data based on selected filters
  const filteredRecentUploads = recentUploads.filter((upload: any) => {
    const clientMatch = activityClientFilter === "all" || upload.userFirstName === activityClientFilter;
    const typeMatch = activityTypeFilter === "all" || activityTypeFilter === "macros";
    return clientMatch && typeMatch;
  });

  const filteredRecentWeightEntries = recentWeightEntries.filter((entry: any) => {
    const clientMatch = activityClientFilter === "all" || entry.userFirstName === activityClientFilter;
    const typeMatch = activityTypeFilter === "all" || activityTypeFilter === "weight";
    return clientMatch && typeMatch;
  });

  const filteredRecentChats = recentChats.filter((chat: any) => {
    const clientMatch = activityClientFilter === "all" || chat.user.firstName === activityClientFilter;
    const typeMatch = activityTypeFilter === "all" || activityTypeFilter === "chats";
    // Only show messages sent TO the trainer (from clients), not messages sent BY the trainer
    const isFromClient = chat.userId !== 'coach_chassidy';
    return clientMatch && typeMatch && isFromClient;
  });

  // Helper function to get client profile image URL
  const getClientProfileImage = (userId: string, userFirstName: string) => {
    const client = clients.find(c => c.id === userId || c.firstName === userFirstName);
    return client?.profileImageUrl || "/default-avatar.png";
  };

  // Combine all activities into a single timeline, sorted by date
  const combinedActivities = [
    ...filteredRecentUploads.map((upload: any) => ({
      type: 'macro',
      data: upload,
      date: new Date(upload.recordedAt),
      user: upload.userFirstName,
      userId: upload.userId,
      message: `${upload.userFirstName} uploaded macro data`,
      color: 'bg-green-500',
      profileImage: getClientProfileImage(upload.userId, upload.userFirstName)
    })),
    ...filteredRecentWeightEntries.map((entry: any) => ({
      type: 'weight',
      data: entry,
      date: new Date(entry.recordedAt),
      user: entry.userFirstName,
      userId: entry.userId,
      message: `${entry.userFirstName} logged weight: ${entry.weight}lbs`,
      color: 'bg-blue-500',
      profileImage: getClientProfileImage(entry.userId, entry.userFirstName)
    })),
    ...filteredRecentChats.map((chat: any) => ({
      type: 'chat',
      data: chat,
      date: new Date(chat.createdAt),
      user: chat.user.firstName,
      userId: chat.userId,
      message: chat.message, // Show full message content
      color: 'bg-purple-500',
      profileImage: getClientProfileImage(chat.userId, chat.user.firstName)
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);

  const renderOverview = () => (
    <div className="space-y-6">


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Clients</p>
                <p className="text-2xl font-bold text-white">{clients.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Reviews</p>
                <p className="text-2xl font-bold text-white">{pendingChanges.length}</p>
              </div>
              <Bell className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Recent Uploads</p>
                <p className="text-2xl font-bold text-white">{recentUploads.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Group Chat</p>
                <p className="text-2xl font-bold text-white">{groupChatUnread.count}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Macro Reviews */}
      {pendingChanges.length > 0 && (
        <Card className="bg-surface border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Bell className="w-5 h-5 text-orange-500" />
              <span>Pending Macro Reviews</span>
              <Badge variant="secondary">{pendingChanges.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingChanges.slice(0, 3).map((change) => (
                <div key={change.id} className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-white">
                        {change.user.firstName} {change.user.lastName}
                      </h4>
                      <p className="text-sm text-gray-400">
                        Requested: {new Date(change.requestDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Proposed Changes</p>
                      <p className="text-sm text-white">
                        {change.proposedCalories} cal, {change.proposedProtein}g protein
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleApproveMacroChange(change.id)}
                      disabled={approveMacroMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setActiveTab('macro-reviews')}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="bg-surface border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {combinedActivities.length > 0 ? (
              combinedActivities.map((activity: any, index: number) => (
                <div key={`activity-${index}`} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                  {/* Profile Image */}
                  <img 
                    src={activity.profileImage} 
                    alt={`${activity.user} profile`} 
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-2 h-2 ${activity.color} rounded-full flex-shrink-0`}></div>
                      <p className="text-sm font-medium text-white">
                        {activity.user}
                      </p>
                    </div>
                    
                    {/* Message Content */}
                    <p className="text-sm text-gray-300 mb-2">
                      {activity.type === 'chat' ? (
                        // For chat messages, show the full message content
                        activity.message
                      ) : activity.type === 'macro' ? (
                        'uploaded macro data'
                      ) : activity.type === 'weight' ? (
                        `logged weight: ${activity.data.weight}lbs`
                      ) : (
                        activity.message
                      )}
                    </p>
                    
                    {/* Timestamp */}
                    <p className="text-xs text-gray-400">
                      {activity.date.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No recent activity to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'macro-reviews':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Macro Reviews</h2>
            {pendingChanges.length === 0 ? (
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-400">No pending macro reviews</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingChanges.map((change) => (
                  <Card key={change.id} className="bg-surface border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-white text-lg">
                            {change.user.firstName} {change.user.lastName}
                          </h4>
                          <p className="text-sm text-gray-400">
                            Requested: {new Date(change.requestDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Current Macros</p>
                          <div className="bg-gray-800 p-3 rounded">
                            <p className="text-sm text-white">
                              {change.currentCalories} cal, {change.currentProtein}g protein,{' '}
                              {change.currentCarbs}g carbs, {change.currentFat}g fat
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Proposed Macros</p>
                          <div className="bg-gray-800 p-3 rounded">
                            <p className="text-sm text-white">
                              {change.proposedCalories} cal, {change.proposedProtein}g protein,{' '}
                              {change.proposedCarbs}g carbs, {change.proposedFat}g fat
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <Label className="text-sm text-gray-400">Reasoning</Label>
                        <div className="bg-gray-800 p-3 rounded mt-1">
                          <p className="text-sm text-white">{change.reasoning}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <Label htmlFor={`notes-${change.id}`} className="text-sm text-gray-400">
                          Trainer Notes (Optional)
                        </Label>
                        <Textarea
                          id={`notes-${change.id}`}
                          value={trainerNotes}
                          onChange={(e) => setTrainerNotes(e.target.value)}
                          placeholder="Add any notes for the client..."
                          className="mt-1 bg-gray-800 border-gray-600 text-white"
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => handleApproveMacroChange(change.id, trainerNotes)}
                          disabled={approveMacroMutation.isPending}
                        >
                          {approveMacroMutation.isPending ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button variant="outline">
                          Edit & Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case 'chat':
        return (
          <UnifiedChatTab 
            selectedClient={selectedClient}
            onClientSelect={setSelectedClient}
          />
        );
      case 'client-progress':
        return selectedClient ? (
          <ClientProgressTimeSeries clientId={selectedClient} />
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Client Progress</h2>
            <Card className="bg-surface border-gray-700">
              <CardContent className="p-8 text-center">
                <p className="text-gray-400">Select a client to view their progress</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'exercises':
        return <ExerciseManagement />;
      case 'ai-settings':
        return <AISettings />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-dark overflow-hidden">
      {/* Mobile App Container */}
      <div className="max-w-md mx-auto bg-dark min-h-screen flex flex-col relative">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-gray-700">
          {/* Top safe area spacer */}
          <div className="bg-surface safe-area-inset-top"></div>
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowProfileSettings(!showProfileSettings)}
                  className="flex-shrink-0 rounded-full hover:ring-2 hover:ring-primary-500 transition-all"
                >
                  <img 
                    src={user?.profileImageUrl || "/CE Bio Image.jpeg"} 
                    alt="Coach profile" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </button>
                <div>
                  <div className="font-semibold text-white">
                    Coach {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Chassidy'}
                  </div>
                  <div className="text-sm text-gray-400">
                    Trainer Dashboard
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-gray-400 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
                <img 
                  src="/ignite-logo.png" 
                  alt="Ignite" 
                  className="h-20 w-auto"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto pt-32 pb-nav">
          <div className="max-w-md mx-auto">
            {showProfileSettings ? (
              <ProfileSettings onBack={() => setShowProfileSettings(false)} />
            ) : (
              renderContent()
            )}
          </div>
        </main>

        {/* Fixed Bottom Navigation */}
        {!showProfileSettings && (
          <TrainerTabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingReviewsCount={pendingChanges.length}
            chatUnreadCount={groupChatUnread.count}
          />
        )}
      </div>
    </div>
  );
}