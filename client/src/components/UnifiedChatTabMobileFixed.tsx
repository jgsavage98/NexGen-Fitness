import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  createdAt: string;
  metadata?: {
    targetUserId?: string;
    fromCoach?: boolean;
  };
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
}

export default function UnifiedChatTabMobileFixed() {
  const [selectedChat, setSelectedChat] = useState<string>('group-chat');
  const [message, setMessage] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  console.log('🔄 Component render:', { selectedChat, forceUpdate, timestamp: new Date().toISOString() });

  // WebSocket message handler for real-time updates
  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('📡 WebSocket message received:', data);
    
    if (data.type === 'new_individual_message' || data.type === 'private_moderation_message') {
      // Refresh all individual chat messages when new messages arrive
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === '/api/trainer/client-chat';
        }
      });
      console.log('🔄 Invalidating individual chat queries due to new message');
      
      // Also invalidate specific client chat if we know the target
      if (data.targetUserId) {
        queryClient.invalidateQueries({ queryKey: ['/api/trainer/client-chat', data.targetUserId] });
        console.log('🔄 Invalidating specific client chat for:', data.targetUserId);
      }
    }
    
    if (data.type === 'new_group_message' || data.type === 'group_counter_update') {
      // Refresh group chat messages when new messages arrive
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/group-chat'] });
      console.log('🔄 Invalidating group chat queries due to new message');
    }
  }, [queryClient]);

  // Initialize WebSocket connection
  useWebSocket(handleWebSocketMessage);

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/trainer/clients'],
    refetchInterval: 3000,
  });

  // Fetch group chat messages
  const { data: groupMessages = [], isLoading: isLoadingGroup } = useQuery<ChatMessage[]>({
    queryKey: ['/api/trainer/group-chat'],
    enabled: selectedChat === 'group-chat',
    refetchInterval: 3000,
  });

  // Fetch individual chat messages - Fixed with proper URL construction
  const { data: individualMessages = [], isLoading: isLoadingIndividual, error: individualError, refetch: refetchIndividualMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/trainer/client-chat', selectedChat],
    enabled: selectedChat !== 'group-chat' && !!selectedChat,
    refetchInterval: 3000,
    staleTime: 0, // Force fresh data
    cacheTime: 0, // Don't cache
    queryFn: async () => {
      if (selectedChat === 'group-chat' || !selectedChat) {
        return [];
      }
      
      console.log(`🔍 Making API call to: /api/trainer/client-chat/${selectedChat}`);
      
      const authToken = localStorage.getItem('url_auth_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/trainer/client-chat/${selectedChat}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Raw API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Individual messages API response:', data);
      
      return data;
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; chatType: 'individual' | 'group'; clientId?: string }) => {
      const authToken = localStorage.getItem('url_auth_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      let url = '/api/chat/messages';
      let body: any = {
        message: data.message,
        chatType: data.chatType,
      };

      // For individual messages from trainer, use the trainer-specific endpoint
      if (data.chatType === 'individual' && data.clientId) {
        url = '/api/trainer/send-message';
        body = {
          clientId: data.clientId,
          message: data.message,
        };
      } else if (data.chatType === 'individual') {
        // Fallback for individual messages
        body.targetUserId = data.clientId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/group-chat'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/client-chat'] });
      toast({
        title: "Message sent successfully",
        description: "Your message has been delivered.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (selectedChat === 'group-chat') {
      sendMessageMutation.mutate({
        message: message.trim(),
        chatType: 'group',
      });
    } else {
      sendMessageMutation.mutate({
        message: message.trim(),
        chatType: 'individual',
        clientId: selectedChat,
      });
    }
  };

  const handleChatSelect = (chatId: string) => {
    console.log(`🎯 Chat selection changed from "${selectedChat}" to "${chatId}"`);
    setSelectedChat(chatId);
  };

  const currentMessages = selectedChat === 'group-chat' ? groupMessages : individualMessages;
  const isLoading = selectedChat === 'group-chat' ? isLoadingGroup : isLoadingIndividual;
  const isGroupChat = selectedChat === 'group-chat';

  // Force re-render when switching to individual chat
  useEffect(() => {
    if (selectedChat !== 'group-chat' && selectedChat) {
      console.log('🔄 Forcing refetch for individual chat:', selectedChat);
      refetchIndividualMessages();
    }
  }, [selectedChat, refetchIndividualMessages]);

  // Force re-render when individualMessages changes
  useEffect(() => {
    if (individualMessages.length > 0) {
      console.log('🔄 Individual messages changed, forcing re-render:', individualMessages.length);
      setForceUpdate(prev => prev + 1);
    }
  }, [individualMessages]);

  // Debug logging for messages
  console.log('🔍 Current state DEBUGGING:', {
    selectedChat,
    isGroupChat,
    groupMessagesLength: groupMessages.length,
    individualMessagesLength: individualMessages.length,
    currentMessagesLength: currentMessages.length,
    isLoading,
    individualError: individualError?.message,
    rawIndividualMessages: individualMessages
  });
  
  if (currentMessages.length > 0) {
    console.log('📝 Current messages:', currentMessages.map(msg => ({
      id: msg.id,
      message: msg.message,
      isAI: msg.isAI,
      userId: msg.userId,
      metadata: msg.metadata
    })));
  } else {
    console.log('❌ No current messages to display');
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const getSelectedClientName = () => {
    if (selectedChat === 'group-chat') return 'Group Chat';
    const client = clients.find(c => c.id === selectedChat);
    return client ? `${client.firstName} ${client.lastName}` : "Select a chat";
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Handle mobile keyboard visibility
  useEffect(() => {
    const handleResize = () => {
      // Force scroll to bottom when keyboard appears/disappears
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-full bg-dark flex flex-col">
      {/* Fixed Chat Selector Header */}
      <div className="fixed top-[100px] left-6 right-6 bg-surface/95 backdrop-blur-sm border-b border-gray-700 p-3 z-[60] rounded-lg shadow-lg">
        <Select 
          value={selectedChat} 
          onValueChange={handleChatSelect}
        >
          <SelectTrigger className="w-full bg-dark border-gray-600 text-white">
            <SelectValue placeholder="Select a chat">
              {selectedChat === 'group-chat' ? (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-3 h-3 text-white" />
                  </div>
                  <span className="truncate">Group Chat ({clients.length} members)</span>
                </div>
              ) : (
                (() => {
                  const client = clients.find(c => c.id === selectedChat);
                  return client ? (
                    <div className="flex items-center space-x-2">
                      <img
                        src={client.profileImageUrl || "/default-avatar.png"}
                        alt={`${client.firstName} ${client.lastName}`}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="truncate">{client.firstName} {client.lastName}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Select a chat</span>
                  );
                })()
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-dark border-gray-600 max-h-48 overflow-y-auto z-50">
            {/* Group Chat Option */}
            <SelectItem value="group-chat" className="text-white hover:bg-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">Group Chat</div>
                  <div className="text-xs text-gray-400 truncate">{clients.length} members</div>
                </div>
              </div>
            </SelectItem>
            {/* Individual Client Options */}
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id} className="text-white hover:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <img
                    src={client.profileImageUrl || "/default-avatar.png"}
                    alt={`${client.firstName} ${client.lastName}`}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{client.firstName} {client.lastName}</div>
                    <div className="text-xs text-gray-400 truncate">{client.email}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scrollable Messages Container with top padding for fixed header */}
      <div 
        className="flex-1 overflow-y-auto bg-dark px-3 py-4 overscroll-contain"
        style={{ 
          paddingTop: '150px', 
          paddingBottom: '140px',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {isGroupChat ? 'No group messages yet' : 
               selectedChat ? `No messages with ${getSelectedClientName()}` : 'Select a chat to start messaging'}
              <div className="text-xs mt-2 text-red-400">
                DEBUG: selectedChat={selectedChat}, messagesLength={currentMessages.length}, 
                isLoading={isLoading ? 'true' : 'false'}, forceUpdate={forceUpdate}
              </div>
            </div>
          ) : (
            currentMessages.map((msg: ChatMessage) => (
              <div key={msg.id} className={`flex ${msg.isAI ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 break-words ${
                  msg.isAI 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-white'
                }`}>
                  <div className="text-xs text-gray-300 mb-1">
                    {msg.isAI ? 'Coach Chassidy' : 
                     isGroupChat ? getClientName(msg.userId) : 
                     getSelectedClientName()}
                  </div>
                  <div className="text-sm break-words whitespace-pre-wrap">
                    {msg.message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Message Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-surface/95 backdrop-blur-sm border-t border-gray-700 p-3 z-[60] shadow-lg">
        <div className="flex space-x-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 bg-dark border-gray-600 text-white placeholder-gray-400 resize-none min-h-[40px] max-h-[120px] text-sm touch-manipulation mobile-input"
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
            rows={1}
            disabled={!selectedChat}
            onFocus={() => {
              // Scroll to bottom when input is focused (keyboard appears)
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 300);
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending || !selectedChat}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm flex-shrink-0"
          >
            {sendMessageMutation.isPending ? '...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}