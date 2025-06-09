import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChatTab() {
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/message", { message });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
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

  const sendVoiceMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const response = await fetch("/api/chat/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: arrayBuffer,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to process voice message");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setIsRecording(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process voice message. Please try again.",
        variant: "destructive",
      });
      setIsRecording(false);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        sendVoiceMutation.mutate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 60000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  };

  const handleVoiceButton = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendQuickReply = (reply: string) => {
    sendMessageMutation.mutate(reply);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-surface border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <img 
            src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
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
      <div className="flex-1 px-6 py-4 overflow-y-auto space-y-4 scrollbar-thin">
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

        {messages.map((message) => (
          <div key={message.id} className="mb-4">
            {message.isAI ? (
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <img 
                    src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
                    alt="Coach Chassidy"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                  />
                  <div className="text-sm flex-1">
                    <p className="font-semibold text-primary-300 mb-1">Message from Coach Chassidy:</p>
                    <p className="text-primary-100 mb-2">
                      {message.message}
                    </p>
                    <span className="text-xs text-primary-300">
                      {formatTime(message.createdAt)}
                      {message.metadata?.isVoice && (
                        <i className="fas fa-microphone ml-2"></i>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="flex items-start space-x-3">
                  <div className="bg-primary-500 rounded-lg rounded-tr-none p-4 max-w-xs">
                    <p className="text-sm text-white">
                      {message.message}
                    </p>
                    <span className="text-xs mt-2 block text-white/70">
                      {formatTime(message.createdAt)}
                      {message.metadata?.isVoice && (
                        <i className="fas fa-microphone ml-2"></i>
                      )}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                    {(user?.profileImageUrl || user?.profilePicture) ? (
                      <img 
                        src={user.profileImageUrl || user.profilePicture}
                        alt="Your Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-xs">
                        {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 
                         user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {(sendMessageMutation.isPending || sendVoiceMutation.isPending) && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <img 
                src="/attached_assets/CE%20Bio%20Image_1749399911915.jpeg" 
                alt="Coach Chassidy"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
              />
              <div className="text-sm flex-1">
                <p className="font-semibold text-primary-300 mb-1">Message from Coach Chassidy:</p>
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-300"></div>
                  <p className="text-primary-100">typing...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {messages.length > 0 && (
        <div className="px-6 py-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendQuickReply("How many calories should I eat today?")}
              className="text-xs bg-surface border-gray-600 text-white hover:bg-gray-700"
            >
              Calories today?
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendQuickReply("I'm feeling tired, should I workout?")}
              className="text-xs bg-surface border-gray-600 text-white hover:bg-gray-700"
            >
              Tired, workout?
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendQuickReply("Show me a quick stretch routine")}
              className="text-xs bg-surface border-gray-600 text-white hover:bg-gray-700"
            >
              Quick stretch
            </Button>
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="px-6 py-4 bg-surface border-t border-gray-700">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="w-full p-3 bg-dark border-gray-600 rounded-2xl pr-12 text-white placeholder-gray-400 resize-none min-h-[48px] max-h-32"
              disabled={sendMessageMutation.isPending}
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="absolute right-3 bottom-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
          
          <Button
            onClick={handleVoiceButton}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${
              isRecording
                ? "bg-error recording animate-pulse"
                : "bg-primary-500 hover:bg-primary-600"
            }`}
            disabled={sendVoiceMutation.isPending}
          >
            <i className={`fas ${isRecording ? "fa-stop" : "fa-microphone"}`}></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
