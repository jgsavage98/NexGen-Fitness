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
  const [chatType, setChatType] = useState<'individual' | 'group'>('individual');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
    enabled: chatType === 'group',
    refetchInterval: 3000,
  });

  // Fetch individual chat messages
  const { data: individualMessages = [], isLoading: isLoadingIndividual } = useQuery<ChatMessage[]>({
    queryKey: ['/api/trainer/client-chat', selectedClient?.id],
    enabled: chatType === 'individual' && !!selectedClient,
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
    if (chatType === 'individual' && !selectedClient) return;

    sendMessageMutation.mutate({
      message: message.trim(),
      chatType,
      clientId: selectedClient?.id,
    });
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
  };

  const filteredClients = clients.filter(client => 
    client.firstName.toLowerCase().includes('') || 
    client.lastName.toLowerCase().includes('') ||
    client.email.toLowerCase().includes('')
  );

  const currentMessages = chatType === 'group' ? groupMessages : individualMessages;
  const isLoading = chatType === 'group' ? isLoadingGroup : isLoadingIndividual;

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  return (
    <div className="flex flex-col h-full bg-dark">
      {/* Chat Type Selector - Fixed at top */}
      <div className="flex-shrink-0 bg-surface border-b border-gray-700">
        <div className="flex w-full">
          <button
            onClick={() => setChatType('individual')}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              chatType === 'individual'
                ? 'bg-blue-600 text-white border-b-2 border-blue-500'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setChatType('group')}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              chatType === 'group'
                ? 'bg-blue-600 text-white border-b-2 border-blue-500'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Group
          </button>
        </div>
      </div>

      {/* Chat Header - Fixed below type selector */}
      <div className="flex-shrink-0 bg-surface border-b border-gray-700">
        {chatType === 'individual' ? (
          <div className="p-3">
            <Select 
              value={selectedClient?.id || ""} 
              onValueChange={handleClientSelect}
            >
              <SelectTrigger className="w-full bg-dark border-gray-600 text-white">
                <SelectValue placeholder="Select a client">
                  {selectedClient && (
                    <div className="flex items-center space-x-2">
                      <img
                        src={selectedClient.profileImageUrl || "/default-avatar.png"}
                        alt={`${selectedClient.firstName} ${selectedClient.lastName}`}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="truncate">{selectedClient.firstName} {selectedClient.lastName}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-dark border-gray-600 max-h-64 overflow-y-auto">
                {filteredClients.map((client) => (
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
        ) : (
          <div className="p-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-white truncate">Group Chat</h3>
                <p className="text-xs text-gray-400 truncate">{clients.length} members</p>
              </div>
            </div>
          </div>
        )}
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
              {chatType === 'group' ? 'No group messages yet' : 
               selectedClient ? `No messages with ${selectedClient.firstName}` : 'Select a client to start chatting'}
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
                     chatType === 'group' ? getClientName(msg.userId) : 
                     selectedClient?.firstName || 'You'}
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
            disabled={chatType === 'individual' && !selectedClient}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending || (chatType === 'individual' && !selectedClient)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm flex-shrink-0"
          >
            {sendMessageMutation.isPending ? '...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}