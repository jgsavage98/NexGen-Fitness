import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// Tabs imports removed - only individual chat functionality
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MessageCircle, Send } from "lucide-react";

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
  unreadCount?: number;
}

export default function TrainerChatTab() {
  const [chatType, setChatType] = useState<'group' | 'individual'>('individual');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [newMessage, setNewMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/trainer/clients'],
    refetchInterval: 15000, // Reduced from 3s to 15s for better performance
    staleTime: 10000, // Cache data for 10 seconds
    gcTime: 60000 // Keep in cache for 1 minute
  });

  // Debug client data
  useEffect(() => {
    if (clients.length > 0) {
      console.log('🔍 TrainerChatTab received clients:', clients.map(c => ({
        name: `${c.firstName} ${c.lastName}`,
        unreadCount: c.unreadCount,
        hasUnreadCount: 'unreadCount' in c
      })));
    }
  }, [clients]);

  // Client data loaded successfully

  // Group chat functionality temporarily hidden
  // const { data: groupUnreadData } = useQuery<{ count: number }>({
  //   queryKey: ['/api/trainer/group-chat-unread'],
  //   refetchInterval: 3000,
  // });



  // Use all clients without filtering
  const filteredClients = clients;

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
      
      // Refresh client list to update unread counts in dropdown badges
      console.log('🔄 Refreshing client list for updated unread counts');
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients'] });
      
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
    refetchInterval: 10000, // Reduced from 3s to 10s for better performance
    staleTime: 5000, // Cache data for 5 seconds
    gcTime: 30000 // Keep in cache for 30 seconds
  });

  // Get trainer user data
  const { data: trainerUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Mark client messages as read when trainer views individual chat
  const markClientMessagesAsRead = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest("POST", `/api/trainer/mark-client-messages-read/${clientId}`);
      return response.json();
    },
    onSuccess: () => {
      console.log('✅ Client messages marked as read, refreshing unread counts');
      // Refresh client list to update unread counts
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients'] });
    },
  });

  // Auto-mark client messages as read when viewing individual chat (only once per client selection)
  useEffect(() => {
    if (chatType === 'individual' && selectedClient && messages.length > 0) {
      console.log(`🔄 Auto-marking client messages as read for client: ${selectedClient}`);
      markClientMessagesAsRead.mutate(selectedClient);
    }
  }, [chatType, selectedClient]); // Removed messages.length and markClientMessagesAsRead to prevent repeated calls

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
    <div className="chat-container h-full flex flex-col">
      {/* Client Selection - Fixed positioning for mobile */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-surface border-b border-gray-700 sticky top-16 sm:top-20 z-30">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-full bg-dark border-gray-600 text-white text-sm sm:text-base touch-manipulation">
              <SelectValue placeholder="Select a client to chat with...">
                {selectedClient && (() => {
                  const client = clients.find(c => c.id === selectedClient);
                  return client ? `${client.firstName} ${client.lastName}` : selectedClient;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent 
              className="bg-dark border-gray-600 max-h-60 sm:max-h-80" 
              style={{zIndex: 9999}}
              position="popper"
              sideOffset={8}
            >
              {filteredClients.map((client) => {
                const fullName = `${client.firstName} ${client.lastName}`;
                console.log(`🔍 Dropdown rendering client: "${fullName}" unreadCount: ${client.unreadCount}`);
                return (
                <SelectItem 
                  key={client.id} 
                  value={client.id} 
                  className="text-white hover:bg-gray-700 focus:bg-gray-700 py-3 touch-manipulation"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      {client.profileImageUrl ? (
                        <img 
                          src={`/${client.profileImageUrl}`}
                          alt={fullName}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs sm:text-sm font-semibold">
                            {client.firstName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-white text-sm sm:text-base truncate">{fullName}</span>
                    </div>
                    {client.unreadCount && client.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0 min-w-[20px] text-center">
                        {client.unreadCount}
                      </span>
                    )}
                  </div>
                </SelectItem>
                );
              })}
            </SelectContent>
        </Select>
      </div>



      {/* Chat Messages - Mobile optimized */}
      <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto space-y-3 sm:space-y-4 scrollbar-thin overflow-x-hidden pb-safe min-h-0 touch-manipulation">
        {!selectedClient && (
          <div className="text-center text-gray-400 py-6 sm:py-8">
            <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-500" />
            <p className="text-sm sm:text-base">Select a client to start an individual conversation</p>
          </div>
        )}

        {selectedClient && messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-400 py-6 sm:py-8">
            <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-500" />
            <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center text-gray-400 py-6 sm:py-8">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2 text-sm sm:text-base">Loading messages...</p>
          </div>
        )}

        {messages.slice().reverse().map((message: ChatMessage) => {
          const isTrainer = message.userId === 'coach_chassidy' || message.metadata?.fromCoach;
          const isFromClient = !isTrainer;
          
          return (
            <div key={message.id} className="mb-3 sm:mb-4">
              {isTrainer ? (
                // Trainer messages on the right (blue bubbles) - Mobile optimized
                <div className="flex justify-end max-w-full">
                  <div className="flex items-start space-x-2 sm:space-x-3 max-w-[90%] sm:max-w-[85%] md:max-w-md">
                    <div className="bg-primary-500 rounded-lg rounded-tr-none p-3 sm:p-4 min-w-0">
                      <p className="text-sm sm:text-base text-white break-words whitespace-pre-wrap overflow-wrap-anywhere leading-relaxed">
                        {message.message}
                      </p>
                      <span className="text-xs mt-1.5 sm:mt-2 block text-white/70">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="/attached_assets/CE Bio Image_1749399911915.jpeg"
                        alt="Coach Chassidy"
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Client messages on the left (gray bubbles) - Mobile optimized
                <div className="flex justify-start max-w-full">
                  <div className="flex items-start space-x-2 sm:space-x-3 max-w-[90%] sm:max-w-[85%] md:max-w-md">
                    {message.user?.profileImageUrl ? (
                      <img 
                        src={`/${message.user.profileImageUrl}`}
                        alt={`${message.user.firstName} ${message.user.lastName}`}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs sm:text-sm font-semibold">
                          {message.user?.firstName ? message.user.firstName.charAt(0) : '?'}
                        </span>
                      </div>
                    )}
                    
                    <div className="bg-gray-700 rounded-lg rounded-tl-none p-3 sm:p-4 min-w-0">
                      {/* Display client name for individual chat messages */}
                      {message.user && (
                        <p className="text-xs text-gray-300 mb-1 font-semibold break-words">
                          {message.user.firstName} {message.user.lastName}
                        </p>
                      )}
                      <p className="text-sm sm:text-base text-white break-words whitespace-pre-wrap overflow-wrap-anywhere leading-relaxed">
                        {message.message}
                      </p>
                      <span className="text-xs mt-1.5 sm:mt-2 block text-white/70">
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

      {/* Chat Input - Mobile optimized, only show when client is selected */}
      {selectedClient && (
        <div className="chat-input-container px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-700 pb-safe bg-surface">
          <div className="flex items-end space-x-2 sm:space-x-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyPress}
                placeholder="Message client..."
                className="w-full p-3 sm:p-3 bg-dark border-gray-600 rounded-2xl pr-12 text-white placeholder-gray-400 resize-none min-h-[44px] sm:min-h-[48px] max-h-32 text-sm sm:text-base touch-manipulation"
                disabled={sendMessageMutation.isPending}
                rows={1}
                style={{ 
                  fontSize: '16px',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                  WebkitAppearance: 'none'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="absolute right-2 sm:right-3 bottom-2.5 sm:bottom-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 touch-manipulation p-1"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}