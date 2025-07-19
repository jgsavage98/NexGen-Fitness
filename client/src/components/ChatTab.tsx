import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// Tabs imports removed - only individual coach chat functionality
import { ChatMessage } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MessageCircle, Send } from "lucide-react";
import PDFAttachment from "@/components/PDFAttachment";

export default function ChatTab() {
  const [newMessage, setNewMessage] = useState("");
  // Group chat functionality temporarily hidden - individual chat only
  const chatType = 'individual';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get individual chat unread count (coach chat only)
  const { data: individualUnreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/chat/individual-unread-count'],
    retry: false,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // Group chat functionality temporarily hidden
  // const { data: groupUnreadData } = useQuery<{ count: number }>({
  //   queryKey: ['/api/chat/group-unread-count'],
  //   retry: false,
  //   refetchInterval: 3000,
  //   refetchIntervalInBackground: true,
  // });

  const individualUnreadCount = Number(individualUnreadData?.count) || 0;
  // const groupUnreadCount = Number(groupUnreadData?.count) || 0;

  // WebSocket message handler for real-time updates
  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'private_moderation_message' || data.type === 'new_group_message') {
      // Refresh message lists when new messages arrive
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    }
    
    if (data.type === 'counter_update' || data.type === 'group_counter_update') {
      // Only update counters if user is not currently viewing the relevant chat type
      if (data.type === 'counter_update') {
        queryClient.invalidateQueries({ queryKey: ['/api/chat/individual-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
      }
      // Group chat functionality temporarily hidden
      // if (data.type === 'group_counter_update' && chatType !== 'group') {
      //   queryClient.invalidateQueries({ queryKey: ['/api/chat/group-unread-count'] });
      // }
    }
  };

  // Initialize WebSocket connection
  useWebSocket(handleWebSocketMessage);

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages", chatType],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/chat/messages?chatType=${chatType}`);
      return response.json();
    },
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue polling when tab is not focused
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch Coach Chassidy's profile data for coach images
  const { data: trainerProfile } = useQuery({
    queryKey: ["/api/coach/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/coach/profile");
      return response.json();
    },
    staleTime: 300000, // Cache for 5 minutes
  });

  // Mark group chat as viewed mutation
  const markGroupViewedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/mark-group-viewed");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate unread count queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/group-unread-count'] });
    },
    onError: (error) => {
      console.error("Error marking group chat as viewed:", error);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/messages", { 
        message,
        chatType 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", chatType] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread-count"] });
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



  const markMessagesAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/mark-read", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/individual-unread-count"] });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when Chat tab opens (individual chat only)
  useEffect(() => {
    markMessagesAsReadMutation.mutate();
    // Immediately clear individual counters
    queryClient.setQueryData(['/api/chat/individual-unread-count'], { count: 0 });
    queryClient.setQueryData(['/api/chat/unread-count'], { count: 0 });
  }, []);

  // Initial load - mark individual messages as read by default and clear counters
  useEffect(() => {
    markMessagesAsReadMutation.mutate();
    // Immediately clear counters on initial load
    queryClient.setQueryData(['/api/chat/individual-unread-count'], { count: 0 });
    queryClient.setQueryData(['/api/chat/unread-count'], { count: 0 });
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
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

  const handleFocus = () => {
    // Scroll to bottom when input is focused to prevent keyboard obstruction
    setTimeout(() => {
      scrollToBottom();
      // Ensure input is visible above keyboard
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
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

  return (
    <div className="chat-container">
      {/* Individual Coach Chat Header */}
      <div className="px-6 py-3 bg-surface border-b border-gray-700 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-white">Coach Chat{individualUnreadCount > 0 ? ` (${individualUnreadCount})` : ''}</h2>
        </div>
      </div>

      {/* Coach Profile Header */}
      <div className="px-6 py-4 bg-surface border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <img 
            src={trainerProfile?.profileImageUrl ? `/${trainerProfile.profileImageUrl}` : "/attached_assets/CE Bio Image_1749399911915.jpeg"}
            alt="Coach Chassidy"
            className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
          />
          <div>
            <div className="font-semibold text-white">Coach Chassidy</div>
            <div className="text-sm text-success flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
              Your Personal Coach • Available 24/7
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto space-y-4 scrollbar-thin overflow-x-hidden pb-4 min-h-0">
        {messages.length === 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <img 
                src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
                alt="Coach Chassidy"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-semibold text-primary-300 mb-1">Message from Coach Chassidy:</p>
                <p className="text-primary-100">
                  Hey there! I'm here to support you with your workouts, nutrition, and answer any questions about your fitness journey. What's on your mind today?
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message: any) => {
          const isCoach = message.isAI || message.metadata?.fromCoach || message.userId === "coach_chassidy";
          const isCurrentUser = message.userId === (user as any)?.id;
          
          return (
            <div key={message.id} className="mb-4">
              {isCoach ? (
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4 max-w-full">
                  <div className="flex items-start space-x-3 min-w-0">
                    <img 
                      src={trainerProfile?.profileImageUrl ? `/${trainerProfile.profileImageUrl}` : "/attached_assets/CE Bio Image_1749399911915.jpeg"}
                      alt="Coach Chassidy"
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                    />
                    <div className="text-sm flex-1 min-w-0">
                      <p className="font-semibold text-primary-300 mb-1">
                        {chatType === 'group' ? 'Coach Chassidy:' : 'Message from Coach Chassidy:'}
                      </p>
                      <p className="text-primary-100 mb-2 break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {message.message}
                      </p>
                      
                      {/* PDF Report Attachment */}
                      {message.metadata?.hasPdfReport && message.metadata?.pdfUrl && (
                        <PDFAttachment
                          pdfPath={message.metadata.pdfUrl}
                          thumbnailPath={message.metadata?.thumbnailUrl}
                          filename={message.metadata?.reportFilename || 'Progress_Report.pdf'}
                          title={message.metadata?.reportTitle || 'Weekly Progress Report'}
                        />
                      )}
                      
                      <span className="text-xs text-primary-300">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} max-w-full`}>
                  <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-md">
                    {!isCurrentUser && chatType === 'group' && (
                      <>
                        {message.user?.profileImageUrl ? (
                          <img 
                            src={message.user.profileImageUrl} 
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
                      </>
                    )}
                    
                    <div className={`rounded-lg p-4 min-w-0 ${
                      isCurrentUser 
                        ? 'bg-primary-500 rounded-tr-none' 
                        : 'bg-gray-700 rounded-tl-none'
                    }`}>
                      {!isCurrentUser && chatType === 'group' && (
                        <p className="text-xs text-gray-300 mb-1 font-semibold break-words">
                          {message.user ? `${message.user.firstName} ${message.user.lastName}` : 'Unknown User'}
                        </p>
                      )}
                      <p className="text-sm text-white break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {message.message}
                      </p>
                      <span className="text-xs mt-2 block text-white/70">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>

                    {isCurrentUser && (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        <img 
                          src={(user as any)?.profileImageUrl || "/john-profile.png"}
                          alt="Your Profile"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}



        <div ref={messagesEndRef} />
      </div>



      {/* Chat Input - Enhanced for mobile keyboard handling */}
      <div className="chat-input-container px-6 py-4 border-t border-gray-700 pb-safe">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              onFocus={handleFocus}
              placeholder="Type your message..."
              className="w-full p-3 bg-dark border-gray-600 rounded-2xl pr-12 text-white placeholder-gray-400 resize-none min-h-[48px] max-h-32"
              disabled={sendMessageMutation.isPending}
              rows={1}
              style={{ 
                fontSize: '16px', // Prevents zoom on iOS
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
    </div>
  );
}
