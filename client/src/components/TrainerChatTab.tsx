import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// Tabs imports removed - only individual chat functionality
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MessageCircle, Search, Send } from "lucide-react";

interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  createdAt: string;
  metadata?: {
    targetUserId?: string;
    fromCoach?: boolean;
    directMessage?: boolean;
    trainerId?: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
  };
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  unansweredCount?: number;
}

export default function TrainerChatTab() {
  const [chatType, setChatType] = useState<'group' | 'individual'>('individual');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/trainer/clients'],
    refetchInterval: 3000,
  });

  // Client data loaded successfully

  // Group chat functionality temporarily hidden
  // const { data: groupUnreadData } = useQuery<{ count: number }>({
  //   queryKey: ['/api/trainer/group-chat-unread'],
  //   refetchInterval: 3000,
  // });



  // Filter clients based on search term
  const filteredClients = clients.filter(client => 
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // const groupUnreadCount = Number(groupUnreadData?.count) || 0;

  // Auto-select first client when switching to individual mode and no client is selected
  useEffect(() => {
    console.log('🔄 ChatType/Client effect:', { chatType, selectedClient, clientsCount: clients.length });
    if (chatType === 'individual' && !selectedClient && clients.length > 0) {
      const firstClient = clients[0];
      console.log('🎯 Auto-selecting first client:', firstClient.id);
      setSelectedClient(firstClient.id);
    }
  }, [chatType, selectedClient, clients]);

  // WebSocket message handler for real-time updates
  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('📡 WebSocket message received:', data);
    
    if (data.type === 'new_individual_message' || data.type === 'private_moderation_message') {
      console.log('🔄 Processing individual message WebSocket event for client:', data.targetUserId);
      
      // Refresh all individual chat messages
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === '/api/trainer/client-chat';
        }
      });
      
      // Also invalidate specific client chat if we know the target
      if (data.targetUserId) {
        console.log('🎯 Invalidating specific client chat:', data.targetUserId);
        queryClient.invalidateQueries({ queryKey: ['/api/trainer/client-chat', data.targetUserId] });
      }
    }
    
    if (data.type === 'new_group_message' || data.type === 'group_counter_update') {
      console.log('🔄 Processing group message WebSocket event');
      // Refresh group chat messages
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/group-chat'] });
    }
  }, [queryClient]);

  // Initialize WebSocket connection
  useWebSocket(handleWebSocketMessage);

  // Fetch messages based on chat type
  console.log('🔍 Query state check:', { 
    chatType, 
    selectedClient, 
    enabled: chatType === 'group' || (chatType === 'individual' && !!selectedClient),
    queryKey: chatType === 'group' 
      ? ['/api/trainer/group-chat'] 
      : ['/api/trainer/client-chat', selectedClient]
  });
  
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: chatType === 'group' 
      ? ['/api/trainer/group-chat'] 
      : ['/api/trainer/client-chat', selectedClient],
    queryFn: async () => {
      if (chatType === 'group') {
        console.log('🔄 Fetching group chat messages');
        const response = await apiRequest("GET", "/api/trainer/group-chat");
        return response.json();
      } else {
        console.log('🔄 Fetching individual chat messages for client:', selectedClient);
        console.log('🔄 Making API request to:', `/api/trainer/client-chat/${selectedClient}`);
        try {
          const response = await apiRequest("GET", `/api/trainer/client-chat/${selectedClient}`);
          console.log('🔄 API response status:', response.status, response.statusText);
          const data = await response.json();
          console.log('📨 Individual chat data received:', data);
          console.log('📊 Message count:', Array.isArray(data) ? data.length : 'Not array');
          return data;
        } catch (error) {
          console.error('❌ API request failed:', error);
          throw error;
        }
      }
    },
    enabled: chatType === 'group' || (chatType === 'individual' && !!selectedClient),
    refetchInterval: 3000,
    gcTime: 0, // Disable caching to force fresh data
    staleTime: 0, // Treat data as immediately stale
  });

  // Get trainer user data
  const { data: trainerUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (chatType === 'group') {
        const response = await apiRequest("POST", "/api/trainer/group-chat", { 
          message 
        });
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/trainer/send-message", { 
          clientId: selectedClient,
          message 
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      console.log('🎉 Message sent successfully:', data);
      console.log('🔄 Invalidating cache for immediate UI update...');
      
      // Immediate cache invalidation
      if (chatType === 'group') {
        console.log('🔄 Invalidating group chat cache');
        queryClient.invalidateQueries({ queryKey: ['/api/trainer/group-chat'] });
      } else {
        console.log('🔄 Invalidating individual chat cache for client:', selectedClient);
        queryClient.invalidateQueries({ queryKey: ['/api/trainer/client-chat', selectedClient] });
      }
      
      setNewMessage("");
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    if (chatType === 'individual' && !selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Individual chat only - no group chat functionality

  return (
    <div className="chat-container">
      {/* Individual Chat Header */}
      <div className="px-6 py-3 bg-surface border-b border-gray-700 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-white">Individual Client Chat</h2>
        </div>
      </div>

      {/* Client Selection */}
      <div className="px-6 py-4 bg-surface border-b border-gray-700">
        <div className="space-y-3">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
          </div>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-full bg-dark border-gray-600 text-white">
                <SelectValue placeholder="Select a client to chat with...">
                  {selectedClient && (() => {
                    const client = clients.find(c => c.id === selectedClient);
                    return client ? (
                      <div className="flex items-center space-x-3">
                        {client.profileImageUrl ? (
                          <img 
                            src={`/${client.profileImageUrl}`}
                            alt={`${client.firstName} ${client.lastName}`}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {client.firstName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span>{client.firstName} {client.lastName}</span>
                      </div>
                    ) : selectedClient;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-dark border-gray-600">
                {filteredClients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="text-white hover:bg-gray-700">
                    <div className="flex items-center space-x-3">
                      {client.profileImageUrl ? (
                        <img 
                          src={`/${client.profileImageUrl}`}
                          alt={`${client.firstName} ${client.lastName}`}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {client.firstName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span>{client.firstName} {client.lastName}</span>
                      {client.unansweredCount && client.unansweredCount > 0 && (
                        <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                          {client.unansweredCount}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat Header */}
      <div className="px-6 py-4 bg-surface border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {selectedClient ? (
            (() => {
              const client = clients.find(c => c.id === selectedClient);
              return client ? (
                <>
                  {client.profileImageUrl ? (
                    <img 
                      src={`/${client.profileImageUrl}`}
                      alt={`${client.firstName} ${client.lastName}`}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center border-2 border-primary/30">
                      <span className="text-white font-semibold">
                        {client.firstName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white">{client.firstName} {client.lastName}</div>
                    <div className="text-sm text-primary-400 flex items-center">
                      <div className="w-2 h-2 bg-primary-400 rounded-full mr-2"></div>
                      Individual Chat • {client.email}
                    </div>
                  </div>
                </>
              ) : null;
            })()
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-white">Individual Chat</div>
                <div className="text-sm text-gray-400">Select a client to start chatting</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto space-y-4 scrollbar-thin overflow-x-hidden pb-4 min-h-0">
        {!selectedClient && (
          <div className="text-center text-gray-400 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p>Select a client to start an individual conversation</p>
          </div>
        )}

        {selectedClient && messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-400 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center text-gray-400 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2">Loading messages...</p>
          </div>
        )}

        {messages.slice().reverse().map((message: ChatMessage) => {
          const isTrainer = message.userId === 'coach_chassidy' || message.metadata?.fromCoach;
          const isFromClient = !isTrainer;
          
          return (
            <div key={message.id} className="mb-4">
              {isTrainer ? (
                // Trainer messages on the right (blue bubbles)
                <div className="flex justify-end max-w-full">
                  <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-md">
                    <div className="bg-primary-500 rounded-lg rounded-tr-none p-4 min-w-0">
                      <p className="text-sm text-white break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {message.message}
                      </p>
                      <span className="text-xs mt-2 block text-white/70">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="/attached_assets/CE Bio Image_1749399911915.jpeg"
                        alt="Coach Chassidy"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Client messages on the left (gray bubbles)
                <div className="flex justify-start max-w-full">
                  <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-md">
                    {message.user?.profileImageUrl ? (
                      <img 
                        src={`/${message.user.profileImageUrl}`}
                        alt={`${message.user.firstName} ${message.user.lastName}`}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {message.user?.firstName ? message.user.firstName.charAt(0) : '?'}
                        </span>
                      </div>
                    )}
                    
                    <div className="bg-gray-700 rounded-lg rounded-tl-none p-4 min-w-0">
                      {/* Display client name for individual chat messages */}
                      {message.user && (
                        <p className="text-xs text-gray-300 mb-1 font-semibold break-words">
                          {message.user.firstName} {message.user.lastName}
                        </p>
                      )}
                      <p className="text-sm text-white break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {message.message}
                      </p>
                      <span className="text-xs mt-2 block text-white/70">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Only show when client is selected */}
      {selectedClient && (
        <div className="chat-input-container px-6 py-4 border-t border-gray-700 pb-safe">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyPress}
                placeholder="Message client..."
                className="w-full p-3 bg-dark border-gray-600 rounded-2xl pr-12 text-white placeholder-gray-400 resize-none min-h-[48px] max-h-32"
                disabled={sendMessageMutation.isPending}
                rows={1}
                style={{ 
                  fontSize: '16px',
                  WebkitUserSelect: 'text',
                  userSelect: 'text'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="absolute right-3 bottom-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}