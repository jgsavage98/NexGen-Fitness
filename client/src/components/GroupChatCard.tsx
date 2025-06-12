import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Send, MessageCircle } from "lucide-react";

export default function GroupChatCard() {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/trainer/group-chat"],
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/trainer/clients"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/message", { 
        message,
        chatType: 'group'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/group-chat"] });
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateString));
  };

  const getUserName = (userId: string) => {
    const client = clients.find((c: Client) => c.id === userId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown User';
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Group Chat</h3>
              <p className="text-sm text-gray-400">
                Chat with all your clients together
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary-600/20 text-primary-300">
            <MessageCircle className="w-3 h-3 mr-1" />
            {messages.length} messages
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 px-6 py-4 overflow-y-auto space-y-4 scrollbar-thin max-h-96">
          {isLoading ? (
            <div className="text-center text-gray-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <img 
                  src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
                  alt="Coach Chassidy"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                />
                <div className="text-sm">
                  <p className="font-semibold text-primary-300 mb-1">Coach Chassidy:</p>
                  <p className="text-primary-100">
                    Welcome to the group chat! This is where we can all connect, share progress, motivate each other, and celebrate wins together. Don't hesitate to ask questions or share your journey!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="mb-4">
                {message.metadata?.fromCoach || message.isAI ? (
                  <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <img 
                        src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
                        alt="Coach Chassidy"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                      />
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-primary-300 mb-1">Coach Chassidy:</p>
                        <p className="text-primary-100 mb-2">
                          {message.message}
                        </p>
                        <span className="text-xs text-primary-300">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-white">
                          {getUserName(message.userId).split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-gray-300 mb-1">{getUserName(message.userId)}:</p>
                        <p className="text-gray-100 mb-2">
                          {message.message}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="px-6 pb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to the group..."
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none min-h-[60px]"
              maxLength={1000}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {newMessage.length}/1000 characters
              </span>
              <Button
                type="submit"
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                {sendMessageMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}