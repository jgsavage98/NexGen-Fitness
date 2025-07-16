import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquare, Users, Search, Menu, X, User } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    return date.toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(client => 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combined chat list with group chat and clients
  const chatList = [
    {
      id: "group-chat",
      name: "Group Chat",
      type: "group",
      unreadCount: groupChatUnread.count,
      lastActivity: new Date().toISOString(),
      profileImageUrl: null,
      isOnline: true
    },
    ...filteredClients.map(client => ({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      type: "individual",
      unreadCount: client.unansweredCount || 0,
      lastActivity: client.programStartDate,
      profileImageUrl: client.profileImageUrl,
      isOnline: Math.random() > 0.5 // Simulate online status
    }))
  ];

  const handleChatSelect = (chatId: string) => {
    setSelectedChatClient(chatId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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
    <div className="flex h-[calc(100vh-8rem)] bg-dark">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? (sidebarCollapsed ? 'w-16' : 'w-80') : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-700 bg-surface flex flex-col`}>
        {/* Sidebar Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chats
              </h2>
            )}
            <div className="flex items-center gap-2">
              {/* Desktop collapse/expand toggle - now visible on all sizes */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebarCollapse}
                className="text-white hover:bg-gray-700"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
              {/* Mobile close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search - Only show when not collapsed */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-dark border-gray-600 text-white placeholder-gray-400 mobile-input"
              />
            </div>
          )}
        </div>

        {/* Chat List - Scrollable */}
        <div className="flex-1 overflow-y-auto mobile-scroll">
          {chatList.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              {sidebarCollapsed ? "" : "No clients found"}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chatList.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`w-full ${sidebarCollapsed ? 'p-2' : 'p-3'} rounded-lg text-left transition-colors touch-optimized chat-button ${
                    selectedChatClient === chat.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 active:bg-gray-600'
                  }`}
                  title={sidebarCollapsed ? chat.name : ""}
                >
                  <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {chat.profileImageUrl ? (
                        <img
                          src={chat.profileImageUrl}
                          alt={chat.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          {chat.type === 'group' ? (
                            <Users className="h-5 w-5 text-gray-300" />
                          ) : (
                            <User className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                      )}
                      {/* Online indicator */}
                      {chat.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                      )}
                      {/* Unread badge on avatar when collapsed */}
                      {sidebarCollapsed && chat.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Chat Info - Only show when not collapsed */}
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{chat.name}</span>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2 px-2 py-1 text-xs flex-shrink-0">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-1">
                          {chat.type === 'group' ? 'Group conversation' : 'Direct message'}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-700 bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="text-white hover:bg-gray-700"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              {sidebarOpen && sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebarCollapse}
                  className="text-white hover:bg-gray-700"
                  title="Expand sidebar"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              
              {selectedChatClient && (
                <>
                  {/* Chat Avatar */}
                  <div className="relative">
                    {selectedChatClient === "group-chat" ? (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <>
                        {clients.find(c => c.id === selectedChatClient)?.profileImageUrl ? (
                          <img
                            src={clients.find(c => c.id === selectedChatClient)?.profileImageUrl}
                            alt={getClientName(selectedChatClient)}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedChatClient === "group-chat" ? "Group Chat" : getClientName(selectedChatClient)}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {selectedChatClient === "group-chat" ? 
                        `${clients.length} members` : 
                        clients.find(c => c.id === selectedChatClient)?.email || 'Direct message'
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        {selectedChatClient ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages Container - Scrollable */}
            <div className="flex-1 overflow-y-auto mobile-scroll p-4 space-y-4">
              {isChatLoading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading messages...
                </div>
              ) : clientChatMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                clientChatMessages.map((message: ChatMessage) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isAI ? "justify-start" : "justify-end"} mb-4`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${
                        message.isAI
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.isAI ? "Coach Chassidy" : 
                           selectedChatClient === "group-chat" ? 
                           (message as any).user?.firstName + " " + (message as any).user?.lastName :
                           getClientName(message.userId)}
                        </span>
                        <span className="text-xs opacity-75">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Fixed */}
            <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-surface">
              <div className="space-y-3">
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
                  className="resize-none bg-dark border-gray-600 text-white placeholder-gray-400 mobile-input touch-optimized"
                  rows={3}
                />
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                  <Button
                    onClick={handleGenerateAI}
                    variant="outline"
                    disabled={isGeneratingAI || generateAIResponseMutation.isPending}
                    className="border-gray-600 text-white hover:bg-gray-700 touch-optimized"
                  >
                    {isGeneratingAI ? "Generating..." : "Generate AI Response"}
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 touch-optimized"
                  >
                    {sendMessageMutation.isPending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}