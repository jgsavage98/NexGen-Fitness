import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, MessageSquare, TrendingUp, Dumbbell, Settings, LogOut, Bell, BarChart3, Heart, Zap, Target } from "lucide-react";
import ProfileSettings from "@/pages/ProfileSettings";
import ClientUploadHistory from "@/components/ClientUploadHistory";
import ClientProgressTimeSeries from "@/components/ClientProgressTimeSeries";
import UnifiedChatTab from "@/components/UnifiedChatTab";
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
  proposedCalories: number;
  proposedProtein: number;
  proposedCarbs: number;
  proposedFat: number;
  reasoning: string;
  requestDate: string;
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
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [trainerNotes, setTrainerNotes] = useState("");
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const [selectedChatClient, setSelectedChatClient] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Force cache invalidation on component mount to get fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/trainer/pending-macro-changes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
  }, [queryClient]);

  // Fetch all clients
  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Debug logging for clients query
  useEffect(() => {
    console.log("Clients query state:", { clients, clientsLoading, clientsError });
  }, [clients, clientsLoading, clientsError]);

  // Fetch pending macro changes
  const { data: pendingChanges = [] } = useQuery<PendingMacroChange[]>({
    queryKey: ["/api/trainer/pending-macro-changes"],
    refetchInterval: 10000, // Check every 10 seconds for new reviews
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale
    onSuccess: (data) => {
      console.log("Pending changes data received:", data);
    },
  });

  // Notification effect for new pending macro changes
  useEffect(() => {
    if (pendingChanges.length > previousPendingCount && previousPendingCount > 0) {
      const newCount = pendingChanges.length - previousPendingCount;
      
      // Show toast notification
      toast({
        title: "New Macro Review Required",
        description: `${newCount} new client macro plan${newCount > 1 ? 's' : ''} need${newCount === 1 ? 's' : ''} your review`,
        duration: 10000,
      });

      // Request browser notification permission and show notification
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

  // Fetch recent chat messages across all clients
  const { data: recentChats = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/trainer/recent-chats"],
  });

  // Fetch pending chat approvals
  const { data: pendingChatApprovals = [] } = useQuery<PendingChatMessage[]>({
    queryKey: ["/api/trainer/pending-chat-approvals"],
    refetchInterval: 10000, // Check for new messages every 10 seconds
  });

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

  // Edit and approve macro change mutation
  const editMacroMutation = useMutation({
    mutationFn: async ({ 
      changeId, 
      finalMacros, 
      notes 
    }: { 
      changeId: number; 
      finalMacros: { calories: number; protein: number; carbs: number; fat: number };
      notes?: string;
    }) => {
      const response = await apiRequest("POST", `/api/trainer/edit-macro-change/${changeId}`, {
        finalMacros,
        trainerNotes: notes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/pending-macro-changes"] });
      toast({
        title: "Success",
        description: "Macro change edited and approved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to edit macro change",
        variant: "destructive",
      });
    },
  });

  // Chat approval mutations
  const approveChatMutation = useMutation({
    mutationFn: async ({ messageId, approvedMessage, trainerNotes }: { 
      messageId: number; 
      approvedMessage?: string; 
      trainerNotes?: string 
    }) => {
      const response = await apiRequest("POST", `/api/trainer/approve-chat/${messageId}`, {
        approvedMessage,
        trainerNotes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/pending-chat-approvals"] });
      toast({
        title: "Success",
        description: "Chat message approved and sent to client",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve chat message",
        variant: "destructive",
      });
    },
  });

  const rejectChatMutation = useMutation({
    mutationFn: async ({ messageId, trainerNotes }: { 
      messageId: number; 
      trainerNotes: string 
    }) => {
      const response = await apiRequest("POST", `/api/trainer/reject-chat/${messageId}`, {
        trainerNotes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/pending-chat-approvals"] });
      toast({
        title: "Success", 
        description: "Chat message rejected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject chat message",
        variant: "destructive",
      });
    },
  });

  // Query to fetch chat messages for selected client
  const { data: clientChatMessages = [], refetch: refetchClientChat } = useQuery({
    queryKey: ['/api/trainer/client-chat', selectedChatClient],
    enabled: !!selectedChatClient,
  });

  // Send message to client mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ clientId, message }: { clientId: string; message: string }) => {
      const response = await apiRequest("POST", "/api/trainer/send-message", {
        clientId,
        message
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message sent to client successfully",
      });
      setNewMessage("");
      // Refetch chat messages to show the new message
      refetchClientChat();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const getClientProgress = (client: Client) => {
    const daysInProgram = client.programStartDate 
      ? calculateJourneyDay(client.programStartDate)
      : 1;
    const weightLossProgress = client.weight && client.goalWeight 
      ? ((client.weight - client.goalWeight) / (client.weight - client.goalWeight)) * 100
      : 0;
    
    return { daysInProgram, weightLossProgress };
  };

  const MacroChangeCard = ({ change }: { change: PendingMacroChange }) => {
    const [editMode, setEditMode] = useState(false);
    const [editedMacros, setEditedMacros] = useState({
      calories: change.proposedCalories,
      protein: change.proposedProtein,
      carbs: change.proposedCarbs,
      fat: change.proposedFat
    });

    return (
      <Card className="bg-surface border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/john-profile.png"
                alt={`${change.user.firstName} ${change.user.lastName}`}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <CardTitle className="text-white text-lg">
                  {change.user.firstName} {change.user.lastName}
                </CardTitle>
                <p className="text-gray-400 text-sm">{change.user.email}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              Pending Review
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2">AI Reasoning:</h4>
              <p className="text-gray-300 text-sm bg-gray-800 p-3 rounded">{change.reasoning}</p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <Label className="text-gray-400">Calories</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editedMacros.calories}
                    onChange={(e) => setEditedMacros(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                ) : (
                  <p className="text-white font-semibold">{change.proposedCalories}</p>
                )}
              </div>
              <div className="text-center">
                <Label className="text-gray-400">Protein</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editedMacros.protein}
                    onChange={(e) => setEditedMacros(prev => ({ ...prev, protein: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                ) : (
                  <p className="text-white font-semibold">{change.proposedProtein}g</p>
                )}
              </div>
              <div className="text-center">
                <Label className="text-gray-400">Carbs</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editedMacros.carbs}
                    onChange={(e) => setEditedMacros(prev => ({ ...prev, carbs: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                ) : (
                  <p className="text-white font-semibold">{change.proposedCarbs}g</p>
                )}
              </div>
              <div className="text-center">
                <Label className="text-gray-400">Fat</Label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editedMacros.fat}
                    onChange={(e) => setEditedMacros(prev => ({ ...prev, fat: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                ) : (
                  <p className="text-white font-semibold">{change.proposedFat}g</p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-gray-400">Trainer Notes (Optional)</Label>
              <Textarea
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                placeholder="Add notes for the client..."
                className="bg-gray-800 border-gray-600 text-white mt-1"
              />
            </div>

            <div className="flex space-x-3">
              {editMode ? (
                <>
                  <Button
                    onClick={() => {
                      editMacroMutation.mutate({
                        changeId: change.id,
                        finalMacros: editedMacros,
                        notes: trainerNotes
                      });
                      setEditMode(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={editMacroMutation.isPending}
                  >
                    Save & Approve
                  </Button>
                  <Button
                    onClick={() => setEditMode(false)}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => approveMacroMutation.mutate({ changeId: change.id, notes: trainerNotes })}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={approveMacroMutation.isPending}
                  >
                    Approve as-is
                  </Button>
                  <Button
                    onClick={() => setEditMode(true)}
                    variant="secondary"
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:text-white"
                  >
                    Edit & Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Show profile settings if requested
  if (showProfileSettings) {
    return <ProfileSettings onBack={() => setShowProfileSettings(false)} />;
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => setShowProfileSettings(true)}
                className="flex-shrink-0 rounded-full hover:ring-2 hover:ring-white/20 transition-all"
              >
                <img
                  src="/chassidy-profile.jpeg"
                  alt="Coach Chassidy"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Coach Chassidy Dashboard</h1>
                <p className="text-sm text-gray-400 hidden sm:block">Personal Trainer & Nutrition Coach</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                {clients.length} Active Clients
              </Badge>
              <div className="relative">
                <Badge variant="outline" className={`text-xs ${pendingChanges.length > 0 ? 'text-yellow-400 border-yellow-400 animate-pulse' : 'text-gray-400 border-gray-400'}`}>
                  <Bell className="w-3 h-3 mr-1" />
                  {pendingChanges.length} Pending Reviews
                </Badge>
                {pendingChanges.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="border-gray-300 text-gray-900 bg-white hover:bg-gray-100 hover:border-gray-400 font-medium text-xs sm:text-sm"
              >
                <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Switch Account</span>
                <span className="sm:hidden">Switch</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-surface border border-gray-700 grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary-500 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 sm:py-1.5">
              <TrendingUp className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden text-xs">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="macro-reviews" className="data-[state=active]:bg-primary-500 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 sm:py-1.5">
              <Settings className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="hidden sm:inline">Macro Reviews ({pendingChanges.length})</span>
              <span className="sm:hidden text-xs">Reviews ({pendingChanges.length})</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-primary-500 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 sm:py-1.5">
              <MessageSquare className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="hidden sm:inline">Chat ({clients.reduce((total, client) => total + (client.unansweredCount || 0), 0)})</span>
              <span className="sm:hidden text-xs">Chat ({clients.reduce((total, client) => total + (client.unansweredCount || 0), 0)})</span>
            </TabsTrigger>
            <TabsTrigger value="client-progress" className="data-[state=active]:bg-primary-500 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 sm:py-1.5">
              <BarChart3 className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="hidden sm:inline">Client Progress</span>
              <span className="sm:hidden text-xs">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="client-setup" className="data-[state=active]:bg-primary-500 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 sm:py-1.5">
              <User className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="hidden sm:inline">Client Setup</span>
              <span className="sm:hidden text-xs">Setup</span>
            </TabsTrigger>
            <TabsTrigger value="client-history" className="data-[state=active]:bg-primary-500 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 sm:py-1.5">
              <Calendar className="w-4 h-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="hidden sm:inline">Upload History</span>
              <span className="sm:hidden text-xs">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Total Clients</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">{clients.length}</p>
                    </div>
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-gray-700">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Pending Reviews</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-400">{pendingChanges.length}</p>
                    </div>
                    <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-gray-700">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Recent Messages</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">{recentChats.length}</p>
                    </div>
                    <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-gray-700">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Active Programs</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-400">
                        {clients.filter(c => c.onboardingCompleted).length}
                      </p>
                    </div>
                    <Dumbbell className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-surface border-gray-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white text-lg sm:text-xl">Recent Client Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {recentChats.slice(0, 5).map((chat) => (
                    <div key={chat.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-800 rounded-lg">
                      <img
                        src="/john-profile.png"
                        alt={`${chat.user.firstName} ${chat.user.lastName}`}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                          <span className="text-white font-medium truncate text-sm sm:text-base">
                            {chat.user.firstName} {chat.user.lastName}
                          </span>
                          <span className="text-gray-400 text-sm flex-shrink-0">
                            {new Date(chat.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-xs sm:text-sm break-words overflow-hidden">
                          <span className="font-medium">
                            {chat.isAI ? "Coach: " : "Client: "}
                          </span>
                          <span className="break-all">
                            {chat.message}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="macro-reviews" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">Pending Macro Adjustments</h2>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                {pendingChanges.length} Reviews Needed
              </Badge>
            </div>

            {pendingChanges.length === 0 ? (
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-6 sm:p-8 text-center">
                  <Settings className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm sm:text-base">No pending macro adjustments to review</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {pendingChanges.map((change) => (
                  <MacroChangeCard key={change.id} change={change} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <UnifiedChatTab />
          </TabsContent>





          <TabsContent value="client-progress" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Client Progress & Macro Analytics</h2>
              <div className="flex space-x-2">
                <select 
                  className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-1"
                  value={selectedClient || ""}
                  onChange={(e) => setSelectedClient(e.target.value || null)}
                >
                  <option value="">Select Client for Analysis</option>
                  {clients.filter(c => c.onboardingCompleted).map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedClient ? (
              <ClientProgressTimeSeries clientId={selectedClient} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client) => {
                  const { daysInProgram } = getClientProgress(client);
                  return (
                    <Card key={client.id} className="bg-surface border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors" 
                          onClick={() => setSelectedClient(client.id)}>
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <img
                            src="/john-profile.png"
                            alt={`${client.firstName} ${client.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <CardTitle className="text-white text-lg">
                              {client.firstName} {client.lastName}
                            </CardTitle>
                            <p className="text-gray-400 text-sm">{client.goal}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Program Day:</span>
                            <span className="text-white font-semibold">{daysInProgram}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Current Weight:</span>
                            <span className="text-white font-semibold">{client.weight} lbs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Goal Weight:</span>
                            <span className="text-white font-semibold">{client.goalWeight} lbs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <Badge variant={client.onboardingCompleted ? "default" : "outline"}>
                              {client.onboardingCompleted ? "Active" : "Onboarding"}
                            </Badge>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-600">
                            <Button 
                              size="sm" 
                              className="w-full bg-primary-600 hover:bg-primary-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client.id);
                              }}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              View Analytics
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="client-setup" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Client Setup Information</h3>
                <p className="text-gray-400 mb-6">Review your clients' onboarding details, goals, and program configuration.</p>
              </div>

              {/* Client Selection */}
              <Card className="bg-surface border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Select Client to Review Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                      <Card
                        key={client.id}
                        className={`cursor-pointer transition-all border-2 ${
                          selectedClient === client.id
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedClient(client.id)}
                      >
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
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant={client.onboardingCompleted ? "default" : "secondary"}
                                  className={client.onboardingCompleted ? "bg-green-600" : "bg-yellow-600"}
                                >
                                  {client.onboardingCompleted ? "Setup Complete" : "Incomplete"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Client Setup Information Display */}
              {selectedClient && (
                <Card className="bg-surface border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {clients.find(c => c.id === selectedClient)?.firstName} {clients.find(c => c.id === selectedClient)?.lastName} - Setup Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const client = clients.find(c => c.id === selectedClient);
                      if (!client) return null;
                      
                      const journeyDay = client.programStartDate ? calculateJourneyDay(client.programStartDate, 'America/Los_Angeles') : 1;
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Basic Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                              Basic Information
                            </h3>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-gray-400">Full Name</Label>
                                <p className="text-white font-medium">{client.firstName} {client.lastName}</p>
                              </div>
                              <div>
                                <Label className="text-gray-400">Email</Label>
                                <p className="text-white font-medium">{client.email}</p>
                              </div>
                              <div>
                                <Label className="text-gray-400">Program Status</Label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge 
                                    variant={client.onboardingCompleted ? "default" : "secondary"}
                                    className={client.onboardingCompleted ? "bg-green-600" : "bg-yellow-600"}
                                  >
                                    {client.onboardingCompleted ? "Onboarding Complete" : "Onboarding Incomplete"}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <Label className="text-gray-400">Program Start Date</Label>
                                <p className="text-white font-medium">
                                  {client.programStartDate ? new Date(client.programStartDate).toLocaleDateString() : "Not set"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-gray-400">Journey Day</Label>
                                <p className="text-white font-medium">Day {journeyDay} of 90</p>
                              </div>
                            </div>
                          </div>

                          {/* Goals & Physical Stats */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                              Goals & Physical Stats
                            </h3>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-gray-400">Primary Goal</Label>
                                <p className="text-white font-medium">{client.goal || "Not specified"}</p>
                              </div>
                              <div>
                                <Label className="text-gray-400">Current Weight</Label>
                                <p className="text-white font-medium">{client.weight ? `${client.weight} lbs` : "Not provided"}</p>
                              </div>
                              <div>
                                <Label className="text-gray-400">Goal Weight</Label>
                                <p className="text-white font-medium">{client.goalWeight ? `${client.goalWeight} lbs` : "Not provided"}</p>
                              </div>
                              {client.weight && client.goalWeight && (
                                <div>
                                  <Label className="text-gray-400">Weight Loss Target</Label>
                                  <p className="text-white font-medium">{Math.abs(client.weight - client.goalWeight)} lbs</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="client-history" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Client Upload History</h3>
                <p className="text-gray-400 mb-6">View nutrition tracking compliance and upload details for your clients.</p>
              </div>

              {/* Client Selection */}
              <Card className="bg-surface border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Select Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                      <Card
                        key={client.id}
                        className={`cursor-pointer transition-all border-2 ${
                          selectedClient === client.id
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedClient(client.id)}
                      >
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
                </CardContent>
              </Card>

              {/* Client Upload History Display */}
              {selectedClient && (
                <ClientUploadHistory clientId={selectedClient} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}