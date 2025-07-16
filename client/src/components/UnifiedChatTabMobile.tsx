import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Users, ChevronDown, User } from "lucide-react";
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

export default function UnifiedChatTabMobile() {
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
        } else {
          const response = await apiRequest("GET", `/api/trainer/client-chat/${selectedChatClient}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch client chat: ${response.status}`);
          }
          const data = await response.json();
          console.log(`Client chat fetched: ${data.length} messages`);
          return data;
        }
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        throw error;
      }
    },
    enabled: !!selectedChatClient,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  // WebSocket connection for real-time updates
  const { socket, isConnected } = useWebSocket({
    onMessage: useCallback((event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_group_message" || data.type === "new_individual_message") {
        refetchClientChat();
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat-unread"] });
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      }
    }, [refetchClientChat, queryClient]),
  });

  // Mutation to send message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      const endpoint = selectedChatClient === "group-chat" 
        ? "/api/trainer/group-chat"
        : `/api/trainer/client-chat/${selectedChatClient}`;
      
      const response = await apiRequest("POST", endpoint, data);
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      refetchClientChat();
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat-unread"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to generate AI response
  const generateAIResponseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trainer/generate-ai-response", {
        chatType: selectedChatClient,
      });
      if (!response.ok) {
        throw new Error(`Failed to generate AI response: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      refetchClientChat();
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat-unread"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (error) => {
      console.error("Error generating AI response:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI response. Please try again.",
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
    return date.toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get current chat info for header display
  const getCurrentChatInfo = () => {
    if (selectedChatClient === "group-chat") {
      return {
        name: "Group Chat",
        subtitle: `${clients.length} members`,
        avatar: null,
        type: "group",
        unreadCount: groupChatUnread.count
      };
    } else {
      const client = clients.find(c => c.id === selectedChatClient);
      if (client) {
        return {
          name: `${client.firstName} ${client.lastName}`,
          subtitle: client.email,
          avatar: client.profileImageUrl,
          type: "individual",
          unreadCount: client.unansweredCount || 0
        };
      }
    }
    return null;
  };

  const currentChatInfo = getCurrentChatInfo();

  // Create options for the select dropdown
  const chatOptions = [
    {
      value: "group-chat",
      label: "Group Chat",
      subtitle: `${clients.length} members`,
      avatar: null,
      unreadCount: groupChatUnread.count
    },
    ...clients.map(client => ({
      value: client.id,
      label: `${client.firstName} ${client.lastName}`,
      subtitle: client.email,
      avatar: client.profileImageUrl,
      unreadCount: client.unansweredCount || 0
    }))
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clientChatMessages]);

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
    <div className="flex flex-col h-full bg-dark">
      {/* Fixed Chat Header with Dropdown Selector */}
      <div className="fixed top-32 left-0 right-0 z-10 flex-shrink-0 p-4 border-b border-gray-700 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Chat Selector Dropdown */}
            <div className="flex-1 max-w-sm">
              <Select value={selectedChatClient} onValueChange={setSelectedChatClient}>
                <SelectTrigger className="w-full bg-dark border-gray-600 text-white">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {currentChatInfo?.avatar ? (
                          <img
                            src={currentChatInfo.avatar}
                            alt={currentChatInfo.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-white text-xs">
                            {currentChatInfo?.type === "group" ? (
                              <Users className="h-3 w-3" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{currentChatInfo?.name}</span>
                          {currentChatInfo?.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs min-w-[16px] h-4 flex items-center justify-center">
                              {currentChatInfo.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {currentChatInfo?.subtitle}
                        </div>
                      </div>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-dark border-gray-600">
                  {chatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                          {option.avatar ? (
                            <img
                              src={option.avatar}
                              alt={option.label}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-white text-xs">
                              {option.value === "group-chat" ? (
                                <Users className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{option.label}</span>
                            {option.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs min-w-[16px] h-4 flex items-center justify-center">
                                {option.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {option.subtitle}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Chat Actions */}
          <div className="flex items-center gap-2">
            {selectedChatClient === "group-chat" && (
              <Button
                onClick={handleGenerateAI}
                disabled={isGeneratingAI}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {isGeneratingAI ? "Generating..." : "Generate AI"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area - with top margin to account for fixed header */}
      <div className="flex-1 overflow-y-auto p-4 mobile-scroll" style={{ marginTop: '100px', marginBottom: '100px' }}>
        {isChatLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : clientChatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">No messages yet. Start the conversation!</div>
          </div>
        ) : (
          <div className="space-y-4">
            {clientChatMessages.map((message: ChatMessage) => (
              <div
                key={message.id}
                className={`flex ${message.isAI ? 'justify-start' : 'justify-end'} mb-4`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[70%] p-3 rounded-lg break-words ${
                    message.isAI
                      ? 'bg-gray-700 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <div className="text-sm mb-1">
                    <span className="font-medium">
                      {message.isAI ? "Coach Chassidy" : 
                       selectedChatClient === "group-chat" ? getClientName(message.userId) : "You"}
                    </span>
                    <span className="text-xs text-gray-300 ml-2">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Fixed Message Input */}
      <div className="fixed bottom-20 left-0 right-0 z-10 flex-shrink-0 p-4 border-t border-gray-700 bg-surface">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 bg-dark border-gray-600 text-white placeholder-gray-400 mobile-input min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            {sendMessageMutation.isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}