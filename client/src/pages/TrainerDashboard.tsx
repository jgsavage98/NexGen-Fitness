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

interface PendingChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  status: string;
  originalAIResponse?: string;
  createdAt: string;
  userFirstName: string;
  userLastName: string;
}

export default function TrainerDashboard() {
  const [activeTab, setActiveTab] = useState<TrainerTabType>('overview');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [trainerNotes, setTrainerNotes] = useState("");
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const [selectedChatClient, setSelectedChatClient] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Activity filtering state
  const [activityClientFilter, setActivityClientFilter] = useState<string>("all");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch all clients
  const { data: clients = [] } = useQuery<Client[]>({
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

  // Fetch group chat unread count
  const { data: groupChatUnread = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/trainer/group-chat-unread"],
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  // Calculate total unread chat count
  const chatUnreadCount = clients.reduce((total, client) => total + (client.unansweredCount || 0), 0) + (groupChatUnread?.count || 0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center">
                    <Users className="mr-2" size={20} />
                    Active Clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{clients.length}</div>
                  <p className="text-gray-400 text-sm">Total clients</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center">
                    <Bell className="mr-2" size={20} />
                    Pending Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{pendingChanges.length}</div>
                  <p className="text-gray-400 text-sm">Need your approval</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center">
                    <MessageSquare className="mr-2" size={20} />
                    Unread Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{chatUnreadCount}</div>
                  <p className="text-gray-400 text-sm">Total unread</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'macro-reviews':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Macro Reviews</h2>
              <Badge variant="secondary" className="bg-blue-900 text-blue-100">
                {pendingChanges.length} pending
              </Badge>
            </div>
            
            {pendingChanges.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <div className="text-gray-400">
                    <Settings className="mx-auto mb-4 h-12 w-12" />
                    <p className="text-xl font-semibold mb-2">No pending reviews</p>
                    <p>All macro changes have been reviewed</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingChanges.map((change) => (
                  <Card key={change.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">
                            {change.user.firstName} {change.user.lastName}
                          </CardTitle>
                          <p className="text-gray-400 text-sm">
                            Requested on {new Date(change.requestDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                          Pending Review
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-white mb-2">Current Macros</h4>
                            <div className="text-sm text-gray-300 space-y-1">
                              <p>Calories: {change.currentCalories}</p>
                              <p>Protein: {change.currentProtein}g</p>
                              <p>Carbs: {change.currentCarbs}g</p>
                              <p>Fat: {change.currentFat}g</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white mb-2">Proposed Macros</h4>
                            <div className="text-sm text-gray-300 space-y-1">
                              <p>Calories: {change.proposedCalories}</p>
                              <p>Protein: {change.proposedProtein}g</p>
                              <p>Carbs: {change.proposedCarbs}g</p>
                              <p>Fat: {change.proposedFat}g</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-white mb-2">Reasoning</h4>
                          <p className="text-gray-300 text-sm">{change.reasoning}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'chat':
        return <UnifiedChatTab />;

      case 'exercises':
        return <ExerciseManagement />;

      case 'client-progress':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Client Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card key={client.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {client.firstName[0]}{client.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {client.firstName} {client.lastName}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Day {client.programStartDate ? calculateJourneyDay(client.programStartDate, 'America/Los_Angeles') : 1}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'client-setup':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Client Setup</h2>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400">
                  <User className="mx-auto mb-4 h-12 w-12" />
                  <p className="text-xl font-semibold mb-2">Client Setup</p>
                  <p>Configure new client onboarding</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'client-history':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Client History</h2>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400">
                  <Calendar className="mx-auto mb-4 h-12 w-12" />
                  <p className="text-xl font-semibold mb-2">Client History</p>
                  <p>View historical client data</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'ai-settings':
        return <AISettings />;

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-gray-700">
        <div className="safe-area-inset-top"></div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">CE</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Coach Chassidy</h1>
                <p className="text-gray-400 text-sm">Trainer Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-white text-sm">{clients.length} Active Clients</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 pb-nav">
        <div className="p-4 space-y-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Fixed Footer Navigation */}
      <TrainerTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingReviewsCount={pendingChanges.length}
        chatUnreadCount={chatUnreadCount}
      />
    </div>
  );
}