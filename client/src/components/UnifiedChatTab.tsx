import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "../hooks/useWebSocket";


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
  const [selectedChatClient, setSelectedChatClient] = useState<string>("group-chat");
  const [newMessage, setNewMessage] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  // Fetch group chat unread count
  const { data: groupChatUnread = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/trainer/group-chat-unread"],
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  // Query to fetch chat messages for selected client or group chat
  const { data: clientChatMessages = [], refetch: refetchClientChat, error: chatError, isLoading: isChatLoading } = useQuery({
    queryKey: selectedChatClient === "group-chat" ? ["/api/trainer/group-chat"] : [`/api/trainer/client-chat/${selectedChatClient}`],
    queryFn: async () => {
      if (!selectedChatClient) return [];
      console.log(`Fetching chat messages for: ${selectedChatClient}`);
      try {
        if (selectedChatClient === "group-chat") {
          const response = await apiRequest("GET", "/api/trainer/group-chat");
          if (!response.ok) {
            throw new Error(`Failed to fetch group chat: ${response.status}`);
          }
          const data = await response.json();
          console.log(`Group chat fetched: ${data.length} messages`);
          return data;
        }
        const response = await apiRequest("GET", `/api/trainer/client-chat/${selectedChatClient}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch client chat: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Individual chat fetched for ${selectedChatClient}: ${data.length} messages`);
        return data;
      } catch (error) {
        console.error("Chat fetch error:", error);
        throw error;
      }
    },
    enabled: !!selectedChatClient,
    retry: 1,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  // Calculate total unanswered messages across all clients
  const totalUnansweredCount = clients.reduce((total, client) => total + (client.unansweredCount || 0), 0);

  // Memoized WebSocket callback to prevent infinite loops
  const handleWebSocketMessage = useCallback((message: any) => {
    const { type } = message;
    
    if (type === 'new_group_message') {
      if (selectedChatClient === "group-chat") {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat-unread"] });
    }
    
    if (type === 'counter_update' || type === 'group_counter_update') {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      if (selectedChatClient && selectedChatClient !== "group-chat") {
        queryClient.invalidateQueries({ queryKey: [`/api/trainer/client-chat/${selectedChatClient}`] });
      }
    }
    
    if (type === 'private_moderation_message') {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      if (selectedChatClient && selectedChatClient !== "group-chat") {
        queryClient.invalidateQueries({ queryKey: [`/api/trainer/client-chat/${selectedChatClient}`] });
      }
    }
  }, [selectedChatClient, queryClient]);

  // Initialize WebSocket connection (disabled for performance optimization)
  // useWebSocket("ws://localhost:5000/ws", handleWebSocketMessage);

  // Update client list when chat messages change to refresh unread counts
  useEffect(() => {
    if (Array.isArray(clientChatMessages) && clientChatMessages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
    }
  }, [clientChatMessages, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [clientChatMessages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; isAI?: boolean }) => {
      if (selectedChatClient === "group-chat") {
        return apiRequest("POST", "/api/chat/messages", {
          message: messageData.message,
          chatType: "group",
          isAI: messageData.isAI || false,
        });
      } else {
        return apiRequest("POST", "/api/chat/messages", {
          message: messageData.message,
          chatType: "individual",
          targetUserId: selectedChatClient,
          isAI: messageData.isAI || false,
        });
      }
    },
    onSuccess: () => {
      setNewMessage("");
      refetchClientChat();
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to send message",
        description: error.message || "An error occurred while sending the message.",
        variant: "destructive",
      });
    },
  });

  // Generate AI response mutation
  const generateAIResponseMutation = useMutation({
    mutationFn: async () => {
      if (selectedChatClient === "group-chat") {
        return apiRequest("POST", "/api/trainer/generate-ai-response", {
          chatType: "group",
        });
      } else {
        return apiRequest("POST", "/api/trainer/generate-ai-response", {
          chatType: "individual",
          targetUserId: selectedChatClient,
        });
      }
    },
    onSuccess: () => {
      refetchClientChat();
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      toast({
        title: "AI response generated",
        description: "Coach Chassidy has responded to the conversation.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to generate AI response:", error);
      toast({
        title: "Failed to generate AI response",
        description: error.message || "An error occurred while generating the AI response.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({ message: newMessage.trim() });
  };

  const handleGenerateAI = () => {
    setIsGeneratingAI(true);
    generateAIResponseMutation.mutate();
    setTimeout(() => setIsGeneratingAI(false), 2000);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (chatError) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>Failed to load chat messages: {chatError.message}</p>
        <Button onClick={() => refetchClientChat()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chat Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Client Communications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Group Chat Option */}
            <Button
              variant={selectedChatClient === "group-chat" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => setSelectedChatClient("group-chat")}
            >
              <div className="flex items-center gap-2 w-full">
                <Users className="h-4 w-4" />
                <span className="font-medium">Group Chat</span>
                {groupChatUnread.count > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {groupChatUnread.count}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Community discussions and group support
              </p>
            </Button>

            {/* Individual Client Chats */}
            {clients.map((client) => (
              <Button
                key={client.id}
                variant={selectedChatClient === client.id ? "default" : "outline"}
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => setSelectedChatClient(client.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                    {client.firstName[0]}
                  </div>
                  <span className="font-medium">{client.firstName} {client.lastName}</span>
                  {(client.unansweredCount || 0) > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {client.unansweredCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  {client.goal} • {client.weight}lbs → {client.goalWeight}lbs
                </p>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      {selectedChatClient && (
        <Card className="flex flex-col h-[600px]">
          <CardHeader className="flex-none">
            <CardTitle>
              {selectedChatClient === "group-chat" ? "Group Chat" : getClientName(selectedChatClient)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {isChatLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading messages...
                </div>
              ) : clientChatMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                clientChatMessages.map((message: ChatMessage) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isAI ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.isAI
                          ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.isAI ? "Coach Chassidy" : 
                           selectedChatClient === "group-chat" ? 
                           (message as any).user?.firstName + " " + (message as any).user?.lastName :
                           getClientName(message.userId)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="flex-none space-y-2">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center">
                <Button
                  onClick={handleGenerateAI}
                  variant="outline"
                  disabled={isGeneratingAI || generateAIResponseMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {isGeneratingAI ? "Generating..." : "Generate AI Response"}
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}