import { useState } from "react";
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
import { User, Calendar, MessageSquare, TrendingUp, Dumbbell, Settings, LogOut } from "lucide-react";

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

export default function TrainerDashboard() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [trainerNotes, setTrainerNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
  });

  // Fetch pending macro changes
  const { data: pendingChanges = [] } = useQuery<PendingMacroChange[]>({
    queryKey: ["/api/trainer/pending-macro-changes"],
  });

  // Fetch recent chat messages across all clients
  const { data: recentChats = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/trainer/recent-chats"],
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

  const getClientProgress = (client: Client) => {
    const daysInProgram = Math.floor(
      (new Date().getTime() - new Date(client.programStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );
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
                    variant="outline"
                    className="border-gray-600 text-gray-300"
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

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/chassidy-profile.jpeg"
                alt="Coach Chassidy"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Coach Chassidy Dashboard</h1>
                <p className="text-gray-400">Personal Trainer & Nutrition Coach</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-400 border-green-400">
                {clients.length} Active Clients
              </Badge>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                {pendingChanges.length} Pending Reviews
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Switch Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-surface border border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary-500">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="macro-reviews" className="data-[state=active]:bg-primary-500">
              <Settings className="w-4 h-4 mr-2" />
              Macro Reviews ({pendingChanges.length})
            </TabsTrigger>
            <TabsTrigger value="chat-logs" className="data-[state=active]:bg-primary-500">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Logs
            </TabsTrigger>
            <TabsTrigger value="client-progress" className="data-[state=active]:bg-primary-500">
              <User className="w-4 h-4 mr-2" />
              Client Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Clients</p>
                      <p className="text-2xl font-bold text-white">{clients.length}</p>
                    </div>
                    <User className="w-8 h-8 text-primary-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Pending Reviews</p>
                      <p className="text-2xl font-bold text-yellow-400">{pendingChanges.length}</p>
                    </div>
                    <Settings className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Recent Messages</p>
                      <p className="text-2xl font-bold text-white">{recentChats.length}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-primary-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Programs</p>
                      <p className="text-2xl font-bold text-green-400">
                        {clients.filter(c => c.onboardingCompleted).length}
                      </p>
                    </div>
                    <Dumbbell className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Client Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentChats.slice(0, 5).map((chat) => (
                    <div key={chat.id} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                      <img
                        src="/john-profile.png"
                        alt={`${chat.user.firstName} ${chat.user.lastName}`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">
                            {chat.user.firstName} {chat.user.lastName}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {new Date(chat.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1 truncate">
                          {chat.isAI ? "Coach: " : "Client: "}{chat.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="macro-reviews" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Pending Macro Adjustments</h2>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                {pendingChanges.length} Reviews Needed
              </Badge>
            </div>

            {pendingChanges.length === 0 ? (
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-8 text-center">
                  <Settings className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No pending macro adjustments to review</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {pendingChanges.map((change) => (
                  <MacroChangeCard key={change.id} change={change} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat-logs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Client Chat History</h2>
              <div className="flex space-x-2">
                <select 
                  className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-1"
                  value={selectedClient || ""}
                  onChange={(e) => setSelectedClient(e.target.value || null)}
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Card className="bg-surface border-gray-700">
              <CardContent className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recentChats
                    .filter(chat => !selectedClient || chat.userId === selectedClient)
                    .map((chat) => (
                    <div key={chat.id} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                      <img
                        src="/john-profile.png"
                        alt={`${chat.user.firstName} ${chat.user.lastName}`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">
                            {chat.user.firstName} {chat.user.lastName}
                          </span>
                          <Badge variant={chat.isAI ? "default" : "outline"} className="text-xs">
                            {chat.isAI ? "Coach" : "Client"}
                          </Badge>
                          <span className="text-gray-400 text-sm">
                            {new Date(chat.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1">{chat.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client-progress" className="space-y-6">
            <h2 className="text-xl font-bold text-white">Client Progress Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => {
                const { daysInProgram } = getClientProgress(client);
                return (
                  <Card key={client.id} className="bg-surface border-gray-700">
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}