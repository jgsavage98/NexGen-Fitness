import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  createdAt: string;
  metadata?: {
    targetUserId?: string;
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

  // Fetch individual chat messages
  const { data: individualMessages = [], isLoading: isLoadingIndividual } = useQuery<ChatMessage[]>({
    queryKey: ['/api/trainer/client-chat', selectedChat],
    enabled: selectedChat !== 'group-chat' && !!selectedChat,
    refetchInterval: 3000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; chatType: 'individual' | 'group'; clientId?: string }) => {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          message: data.message,
          chatType: data.chatType,
          ...(data.chatType === 'individual' && { targetUserId: data.clientId }),
        }),
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
    setSelectedChat(chatId);
  };

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  return (
    <div className="flex flex-col h-full bg-dark">
      {/* Chat Selector - Fixed at top */}
      <div className="flex-shrink-0 bg-surface border-b border-gray-700 sticky top-0 z-10">
        <div className="p-3">
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
            <SelectContent className="bg-dark border-gray-600 max-h-64 overflow-y-auto">
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
      </div>

      {/* Messages Area - Scrollable Container */}
      <div className="flex-1 min-h-0 overflow-y-auto mobile-scroll bg-dark px-3 py-2">
        <div className="space-y-3 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {isGroupChat ? 'No group messages yet' : 
               selectedChat ? `No messages with ${getSelectedClientName()}` : 'Select a chat to start messaging'}
            </div>
          ) : (
            currentMessages.map((msg: ChatMessage) => (
              <div key={msg.id} className={`flex ${msg.isAI ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 break-words ${
                  msg.isAI 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-blue-600 text-white'
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

      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0 bg-surface border-t border-gray-700 p-3">
        <div className="flex space-x-2 w-full">
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
            className="flex-1 bg-dark border-gray-600 text-white placeholder-gray-400 resize-none min-h-[40px] max-h-[120px] text-sm"
            rows={1}
            disabled={!selectedChat}
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