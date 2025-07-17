import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

export default function UnifiedChatTabFixed() {
  const [selectedChat, setSelectedChat] = useState<string>('group-chat');
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

  // Fetch individual chat messages - Fixed logic
  const { data: individualMessages = [], isLoading: isLoadingIndividual, error: individualError } = useQuery<ChatMessage[]>({
    queryKey: ['/api/trainer/client-chat', selectedChat],
    queryFn: async () => {
      if (selectedChat === 'group-chat' || !selectedChat) {
        return [];
      }
      
      console.log(`🔍 Making API call to: /api/trainer/client-chat/${selectedChat}`);
      
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/trainer/client-chat/${selectedChat}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`📡 API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API call failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch individual chat messages: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📥 Individual chat messages received:`, data);
      return data;
    },
    enabled: selectedChat !== 'group-chat' && !!selectedChat,
    refetchInterval: 3000,
    retry: 3,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; chatType: 'individual' | 'group'; clientId?: string }) => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: data.message,
          chatType: data.chatType,
          ...(data.chatType === 'individual' && { targetUserId: data.clientId }),
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/group-chat'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/client-chat'] });
      toast({
        title: "Message sent successfully",
        description: "Your message has been delivered.",
      });
    },
    onError: (error) => {
      console.error('Send message error:', error);
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    console.log(`📤 Sending message to ${selectedChat}:`, message.trim());
    
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages, individualMessages]);

  // Debugging logs
  useEffect(() => {
    console.log('📊 Chat State:', {
      selectedChat,
      clientsCount: clients.length,
      groupMessagesCount: groupMessages.length,
      individualMessagesCount: individualMessages.length,
      isLoadingGroup,
      isLoadingIndividual,
      individualError: individualError?.message,
    });
  }, [selectedChat, clients, groupMessages, individualMessages, isLoadingGroup, isLoadingIndividual, individualError]);

  const currentMessages = selectedChat === 'group-chat' ? groupMessages : individualMessages;
  const isLoading = selectedChat === 'group-chat' ? isLoadingGroup : isLoadingIndividual;
  const isGroupChat = selectedChat === 'group-chat';

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

  return (
    <div className="flex flex-col h-full bg-dark">
      {/* Fixed Header with Chat Selector */}
      <div className="sticky top-0 z-50 bg-surface border-b border-gray-700 shadow-lg">
        <div className="p-4">
          <Select 
            value={selectedChat} 
            onValueChange={handleChatSelect}
          >
            <SelectTrigger className="w-full bg-dark border-gray-600 text-white hover:bg-gray-800 focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select a chat">
                {selectedChat === 'group-chat' ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="truncate font-medium">Group Chat ({clients.length} members)</span>
                  </div>
                ) : (
                  (() => {
                    const client = clients.find(c => c.id === selectedChat);
                    return client ? (
                      <div className="flex items-center space-x-3">
                        <img
                          src={client.profileImageUrl || "/default-avatar.png"}
                          alt={`${client.firstName} ${client.lastName}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="truncate font-medium">{client.firstName} {client.lastName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Select a chat</span>
                    );
                  })()
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent 
              className="bg-dark border-gray-600 max-h-80 overflow-y-auto z-[60]" 
              sideOffset={5}
              position="popper"
            >
              {/* Group Chat Option */}
              <SelectItem value="group-chat" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                <div className="flex items-center space-x-3 py-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">Group Chat</div>
                    <div className="text-sm text-gray-400 truncate">{clients.length} members</div>
                  </div>
                </div>
              </SelectItem>
              
              {/* Individual Client Options */}
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                  <div className="flex items-center space-x-3 py-2">
                    <img
                      src={client.profileImageUrl || "/default-avatar.png"}
                      alt={`${client.firstName} ${client.lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{client.firstName} {client.lastName}</div>
                      <div className="text-sm text-gray-400 truncate">{client.email}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages Container - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-dark px-4 py-3">
        <div className="space-y-4 min-h-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : individualError ? (
            <div className="text-center py-12">
              <div className="text-red-400 mb-2">Error loading chat messages</div>
              <div className="text-sm text-gray-400">{individualError.message}</div>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {isGroupChat ? 'No group messages yet' : 
               selectedChat ? `No messages with ${getSelectedClientName()}` : 'Select a chat to start messaging'}
            </div>
          ) : (
            currentMessages.map((msg: ChatMessage) => (
              <div key={msg.id} className={`flex ${msg.isAI || msg.metadata?.fromCoach ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] rounded-lg px-4 py-3 break-words ${
                  msg.isAI || msg.metadata?.fromCoach
                    ? 'bg-gray-700 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  <div className="text-xs text-gray-300 mb-1 font-medium">
                    {msg.isAI || msg.metadata?.fromCoach ? 'Coach Chassidy' : 
                     isGroupChat ? getClientName(msg.userId) : 
                     getSelectedClientName()}
                  </div>
                  <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
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
      <div className="sticky bottom-0 bg-surface border-t border-gray-700 p-4">
        <div className="flex space-x-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={selectedChat === 'group-chat' ? 'Type a message to the group...' : `Type a message to ${getSelectedClientName()}...`}
            className="flex-1 bg-dark border-gray-600 text-white placeholder-gray-400 resize-none min-h-[44px] max-h-[120px] focus:ring-2 focus:ring-blue-500"
            rows={1}
            disabled={!selectedChat}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending || !selectedChat}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 h-[44px] flex-shrink-0 disabled:opacity-50"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}