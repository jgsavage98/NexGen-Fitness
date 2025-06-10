import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  createdAt: string;
  metadata?: any;
  status?: string;
}

export default function UnifiedChatTab() {
  const [selectedChatClient, setSelectedChatClient] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all clients sorted by unanswered messages
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
  });

  // Calculate total unanswered messages across all clients
  const totalUnansweredCount = clients.reduce((total, client) => total + (client.unansweredCount || 0), 0);

  // Query to fetch chat messages for selected client
  const { data: clientChatMessages = [], refetch: refetchClientChat } = useQuery({
    queryKey: [`/api/trainer/client-chat/${selectedChatClient}`],
    enabled: !!selectedChatClient,
  });

  // Send message to client mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ clientId, message }: { clientId: string; message: string }) => {
      const response = await apiRequest("POST", "/api/trainer/send-message", {
        clientId,
        message,
      });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      refetchClientChat();
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent to the client",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Client Chat Management</h2>
        <div className="flex space-x-2">
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            Unified Chat
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Client List Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-surface border-gray-700 h-full">
            <CardHeader>
              <CardTitle className="text-white text-sm">Clients (Most Unanswered First)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {clients.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No clients found</p>
                  </div>
                ) : (
                  clients
                    .sort((a, b) => {
                      // First sort by unanswered count (descending)
                      const aCount = a.unansweredCount || 0;
                      const bCount = b.unansweredCount || 0;
                      if (bCount !== aCount) return bCount - aCount;
                      // Then alphabetically by name for consistent ordering
                      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
                    })
                    .map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedChatClient(client.id)}
                      className={`w-full text-left p-3 border-b border-gray-700 hover:bg-gray-800 transition-colors ${
                        selectedChatClient === client.id ? 'bg-gray-800 border-l-4 border-l-primary-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {client.profileImageUrl ? (
                            <img 
                              src={client.profileImageUrl} 
                              alt={`${client.firstName} ${client.lastName}`}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                              <span className="text-white font-semibold text-xs">
                                {client.firstName[0]}{client.lastName[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="text-white font-medium text-sm">
                              {client.firstName} {client.lastName}
                            </h4>
                            <p className="text-gray-400 text-xs">{client.email}</p>
                          </div>
                        </div>
                        {(client.unansweredCount || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {client.unansweredCount}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {!selectedChatClient ? (
            <Card className="bg-surface border-gray-700 h-full flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Select a client to start chatting</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-surface border-gray-700 h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {(() => {
                          const client = clients.find(c => c.id === selectedChatClient);
                          return client ? `${client.firstName[0]}${client.lastName[0]}` : '?';
                        })()}
                      </span>
                    </div>
                    <span>
                      {(() => {
                        const client = clients.find(c => c.id === selectedChatClient);
                        return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
                      })()}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto border border-gray-600 rounded-lg p-4 space-y-3 bg-gray-900 min-h-0">
                  {!Array.isArray(clientChatMessages) || clientChatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No conversation yet. Start by sending a message!</p>
                    </div>
                  ) : (
                    clientChatMessages.map((message: ChatMessage) => (
                      <div key={message.id} className={`flex ${
                        message.metadata?.fromCoach || message.isAI ? 'justify-start' : 'justify-end'
                      }`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${
                          message.metadata?.fromCoach 
                            ? 'bg-green-600 text-white' 
                            : message.isAI 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-700 text-gray-100'
                        }`}>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium">
                              {message.metadata?.fromCoach 
                                ? 'Coach Chassidy' 
                                : message.isAI 
                                  ? 'AI Coach' 
                                  : clients.find(c => c.id === selectedChatClient)?.firstName || 'Client'}
                            </span>
                            <span className="text-xs opacity-70">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm break-words">{message.message}</p>
                          {message.status === 'pending_approval' && (
                            <Badge variant="outline" className="mt-1 text-xs border-orange-300 text-orange-300">
                              Pending Approval
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0 space-y-3">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="bg-gray-800 border-gray-600 text-white min-h-[80px] resize-none"
                    disabled={sendMessageMutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newMessage.trim()) {
                          sendMessageMutation.mutate({
                            clientId: selectedChatClient,
                            message: newMessage.trim()
                          });
                        }
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={async () => {
                          setIsGeneratingAI(true);
                          try {
                            const response = await fetch('/api/trainer/generate-ai-response', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                clientId: selectedChatClient,
                                context: 'General coaching support' 
                              })
                            });
                            
                            if (response.ok) {
                              refetchClientChat();
                              toast({ 
                                title: "AI Response Generated", 
                                description: "New AI response added to chat" 
                              });
                            }
                          } catch (error) {
                            toast({ 
                              title: "Error", 
                              description: "Failed to generate AI response",
                              variant: "destructive" 
                            });
                          } finally {
                            setIsGeneratingAI(false);
                          }
                        }}
                        disabled={isGeneratingAI}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        {isGeneratingAI ? "Generating..." : "Generate AI Response"}
                      </Button>
                      <Button
                        onClick={() => {
                          if (newMessage.trim()) {
                            sendMessageMutation.mutate({
                              clientId: selectedChatClient,
                              message: newMessage.trim()
                            });
                          }
                        }}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {sendMessageMutation.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}