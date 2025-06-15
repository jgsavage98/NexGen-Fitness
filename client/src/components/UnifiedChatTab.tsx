import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";


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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket((message) => {
    const { type } = message;
    
    if (type === 'new_group_message') {
      // Refresh group chat messages
      if (selectedChatClient === "group-chat") {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", "group-chat"] });
      }
      // Refresh group chat unread count
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat-unread"] });
    }
    
    if (type === 'counter_update' || type === 'group_counter_update') {
      // Refresh client list to update badge counters
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      // Refresh specific chat if it's open
      if (selectedChatClient && selectedChatClient !== "group-chat") {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedChatClient] });
      }
    }
    
    if (type === 'private_moderation_message') {
      // Refresh individual chat messages and counters
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      if (selectedChatClient && selectedChatClient !== "group-chat") {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedChatClient] });
      }
    }
  });

  // Fetch trainer profile data
  const { data: trainerProfile } = useQuery({
    queryKey: ["/api/auth/user"],
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch all clients sorted by unanswered messages
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
    refetchInterval: 2000, // Refetch every 2 seconds to update message counts
    refetchIntervalInBackground: true,
  });

  // Fetch group chat unread count
  const { data: groupChatUnread = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/trainer/group-chat-unread"],
    refetchInterval: 2000, // Refetch every 2 seconds to update counts
    refetchIntervalInBackground: true,
  });

  // Calculate total unanswered messages across all clients
  const totalUnansweredCount = clients.reduce((total, client) => total + (client.unansweredCount || 0), 0);

  // Query to fetch chat messages for selected client or group chat
  const { data: clientChatMessages = [], refetch: refetchClientChat, error: chatError } = useQuery({
    queryKey: selectedChatClient === "group-chat" ? ["/api/trainer/group-chat"] : [`/api/trainer/client-chat/${selectedChatClient}`],
    queryFn: async () => {
      if (!selectedChatClient) return [];
      try {
        if (selectedChatClient === "group-chat") {
          const response = await apiRequest("GET", "/api/trainer/group-chat");
          if (!response.ok) {
            throw new Error(`Failed to fetch group chat: ${response.status}`);
          }
          return response.json();
        }
        const response = await apiRequest("GET", `/api/trainer/client-chat/${selectedChatClient}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch client chat: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error("Chat fetch error:", error);
        throw error;
      }
    },
    enabled: !!selectedChatClient,
    retry: false, // Don't retry failed requests to prevent spam
    refetchInterval: selectedChatClient ? 3000 : false, // Only refetch when chat is selected
    refetchIntervalInBackground: true,
  });

  // Update client list when chat messages change to refresh unread counts
  useEffect(() => {
    if (Array.isArray(clientChatMessages) && clientChatMessages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
    }
  }, [clientChatMessages, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper function to get user name for group chat messages
  const getUserName = (userId: string) => {
    if (userId === "coach_chassidy") return "Coach Chassidy";
    const client = clients.find(c => c.id === userId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown User';
  };

  useEffect(() => {
    scrollToBottom();
  }, [clientChatMessages]);

  // Mark group chat as viewed mutation
  const markGroupViewedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/mark-group-viewed");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate group chat unread count
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat-unread"] });
    },
    onError: (error) => {
      console.error("Error marking group chat as viewed:", error);
    },
  });

  // Mark individual chat messages as read for trainer
  const markIndividualChatViewedMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest("POST", "/api/trainer/mark-messages-read", {
        clientId: clientId
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate client list to update unread counts
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
    },
    onError: (error) => {
      console.error("Error marking individual chat as viewed:", error);
    },
  });

  // Invalidate client list when a chat is opened to update unanswered counts
  useEffect(() => {
    if (selectedChatClient) {
      // Mark group chat as viewed when group chat is selected
      if (selectedChatClient === "group-chat") {
        markGroupViewedMutation.mutate();
      } else {
        // Mark individual chat messages as read for trainer
        markIndividualChatViewedMutation.mutate(selectedChatClient);
      }
      
      // Immediately invalidate to refresh the count after chat is opened
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      
      // Also invalidate after a short delay to ensure backend processing is complete
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      }, 1000);
    }
  }, [selectedChatClient, queryClient, markGroupViewedMutation, markIndividualChatViewedMutation]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ clientId, message }: { clientId: string; message: string }) => {
      if (clientId === "group-chat") {
        const response = await apiRequest("POST", "/api/chat/message", {
          message,
          chatType: 'group'
        });
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/trainer/send-message", {
          clientId,
          message,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      setNewMessage("");
      refetchClientChat();
      // Immediately invalidate client list to update badges
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      // Also force refetch to ensure immediate badge updates
      queryClient.refetchQueries({ queryKey: ["/api/trainer/clients"] });
      // Auto-scroll to bottom after sending message
      setTimeout(scrollToBottom, 100);
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



      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 min-h-[600px] lg:h-[600px]">
        {/* Client List Sidebar */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          <Card className="bg-surface border-gray-700 h-auto lg:h-full">
            <CardHeader>
              <CardTitle className="text-white text-sm">Clients (Most Unanswered First)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[300px] lg:max-h-[500px] overflow-y-auto">
                {/* Group Chat Option */}
                <button
                  onClick={() => setSelectedChatClient("group-chat")}
                  className={`w-full text-left p-3 border-b border-gray-700 hover:bg-gray-800 transition-colors ${
                    selectedChatClient === "group-chat" ? 'bg-gray-800 border-l-4 border-l-primary-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">Group Chat</h4>
                        <p className="text-gray-400 text-xs">All Clients</p>
                      </div>
                    </div>
                    {groupChatUnread.count > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {groupChatUnread.count}
                      </span>
                    )}
                  </div>
                </button>

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
        <div className="lg:col-span-2 order-1 lg:order-2">
          {!selectedChatClient ? (
            <Card className="bg-surface border-gray-700 h-auto lg:h-full flex items-center justify-center min-h-[300px]">
              <CardContent className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Select a client to start chatting</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-surface border-gray-700 h-auto lg:h-[600px] flex flex-col min-h-[400px] lg:min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedChatClient === "group-chat" ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <span>Group Chat - All Clients</span>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const client = clients.find(c => c.id === selectedChatClient);
                          if (!client) return null;
                          
                          return client.profileImageUrl ? (
                            <img 
                              src={client.profileImageUrl} 
                              alt={`${client.firstName} ${client.lastName}`}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {client.firstName[0]}{client.lastName[0]}
                              </span>
                            </div>
                          );
                        })()}
                        <span>
                          {(() => {
                            const client = clients.find(c => c.id === selectedChatClient);
                            return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
                          })()}
                        </span>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto border border-gray-600 rounded-lg p-4 space-y-3 bg-gray-900 max-h-[400px]">
                  {!Array.isArray(clientChatMessages) || clientChatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No conversation yet. Start by sending a message!</p>
                    </div>
                  ) : (
                    clientChatMessages.map((message: ChatMessage) => (
                      <div key={message.id} className={`flex ${
                        (selectedChatClient === "group-chat" && message.userId === "coach_chassidy") ||
                        (selectedChatClient !== "group-chat" && (message.metadata?.fromCoach || message.isAI)) 
                          ? 'justify-start' : 'justify-end'
                      }`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${
                          (selectedChatClient === "group-chat" && message.userId === "coach_chassidy") ||
                          (selectedChatClient !== "group-chat" && message.metadata?.fromCoach)
                            ? 'bg-green-600 text-white' 
                            : message.isAI 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-700 text-gray-100'
                        }`}>
                          <div className="flex items-center space-x-2 mb-1">
                            {selectedChatClient === "group-chat" && (
                              <>
                                {message.userId === "coach_chassidy" ? (
                                  <img 
                                    src={(trainerProfile as any)?.profileImageUrl ? `/${(trainerProfile as any).profileImageUrl}` : "/attached_assets/CE%20Bio%20Image_1749399911915.jpeg"}
                                    alt="Coach Chassidy"
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  (() => {
                                    const client = clients.find(c => c.id === message.userId);
                                    return client?.profileImageUrl ? (
                                      <img 
                                        src={client.profileImageUrl} 
                                        alt={`${client.firstName} ${client.lastName}`}
                                        className="w-5 h-5 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                        <span className="text-white font-semibold text-xs">
                                          {client ? `${client.firstName[0]}${client.lastName[0]}` : 'U'}
                                        </span>
                                      </div>
                                    );
                                  })()
                                )}
                              </>
                            )}
                            <span className="text-xs font-medium">
                              {selectedChatClient === "group-chat" 
                                ? getUserName(message.userId)
                                : message.metadata?.fromCoach 
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
                          {message.status === 'pending_approval' && !message.metadata?.fromCoach && (
                            <Badge variant="outline" className="mt-1 text-xs border-orange-300 text-orange-300">
                              Pending Approval
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {/* Invisible element to scroll to */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input - Always visible at bottom */}
                <div className="flex-shrink-0 space-y-3 mt-4 border-t border-gray-600 pt-4">
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
                            // Get the last client message to respond to
                            const messages = Array.isArray(clientChatMessages) ? clientChatMessages : [];
                            const lastClientMessage = messages
                              .filter((msg: ChatMessage) => !msg.isAI && (!msg.metadata || !(msg.metadata as any)?.fromCoach))
                              .slice(-1)[0];
                            
                            if (!lastClientMessage) {
                              toast({ 
                                title: "No message to respond to", 
                                description: "There are no client messages to generate a response for",
                                variant: "destructive" 
                              });
                              return;
                            }

                            const response = await apiRequest('POST', '/api/trainer/generate-draft-response', {
                              clientId: selectedChatClient,
                              lastMessage: lastClientMessage.message,
                              messageContext: messages.slice(-5) // Send last 5 messages for context
                            });
                            
                            const data = await response.json();
                            if (data.draftResponse) {
                              setNewMessage(data.draftResponse);
                              toast({ 
                                title: "AI Draft Generated", 
                                description: "Review and edit the draft before sending" 
                              });
                            }
                          } catch (error) {
                            toast({ 
                              title: "Error", 
                              description: "Failed to generate AI draft response",
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