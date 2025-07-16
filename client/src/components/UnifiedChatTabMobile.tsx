import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Users, ChevronDown, User, MessageCircle } from "lucide-react";
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [chatType, setChatType] = useState<'individual' | 'group'>('individual');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
    refetchInterval: 3000,
  });

  // Fetch group chat messages
  const { data: groupMessages = [], isLoading: groupLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/trainer/group-chat"],
    enabled: chatType === 'group',
    refetchInterval: 2000,
  });

  // Fetch individual chat messages
  const { data: clientMessages = [], isLoading: clientLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/trainer/client-chat/${selectedClient?.id}`],
    enabled: chatType === 'individual' && !!selectedClient,
    refetchInterval: 2000,
  });

  // WebSocket connection
  const { socket, isConnected } = useWebSocket({
    onMessage: useCallback((event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_group_message" || data.type === "new_individual_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat"] });
        queryClient.invalidateQueries({ queryKey: [`/api/trainer/client-chat/${selectedClient?.id}`] });
      }
    }, [queryClient, selectedClient?.id]),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string }) => {
      const endpoint = chatType === 'group' 
        ? "/api/trainer/group-chat"
        : `/api/trainer/client-chat/${selectedClient?.id}`;
      
      const response = await apiRequest("POST", endpoint, messageData);
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat"] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainer/client-chat/${selectedClient?.id}`] });
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

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (chatType === 'individual' && !selectedClient) return;
    
    sendMessageMutation.mutate({ message: message.trim() });
  };

  const filteredClients = clients.filter((client: Client) =>
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentMessages = chatType === 'group' ? groupMessages : clientMessages;
  const isLoading = chatType === 'group' ? groupLoading : clientLoading;

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
    <div className="flex flex-col h-full bg-dark max-w-full">
      {/* Chat Type Selector - Sticky at top */}
      <div className="sticky top-0 z-20 bg-surface border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setChatType('individual')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              chatType === 'individual'
                ? 'bg-blue-600 text-white border-b-2 border-blue-500'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setChatType('group')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              chatType === 'group'
                ? 'bg-blue-600 text-white border-b-2 border-blue-500'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Group
          </button>
        </div>
      </div>

      {/* Chat Header - Sticky below type selector */}
      <div className="sticky top-12 z-10 bg-surface border-b border-gray-700">
        {chatType === 'individual' ? (
          <div className="p-3">
            <Select 
              value={selectedClient?.id || ""} 
              onValueChange={(value) => {
                const client = clients.find(c => c.id === value);
                setSelectedClient(client || null);
              }}
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

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-dark px-3 py-2">
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
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
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
      <div className="sticky bottom-0 bg-surface border-t border-gray-700 p-3">
        <div className="flex space-x-2 max-w-full">
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