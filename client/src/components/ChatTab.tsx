import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChatTab() {
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
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
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
            <i className="fas fa-robot text-white"></i>
          </div>
          <div>
            <div className="font-semibold text-white">Virtual Agent</div>
            <div className="text-sm text-success flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
              AI Assistant • Online 24/7
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 px-6 py-4 overflow-y-auto space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <div className="bg-surface rounded-lg rounded-tl-none p-4 max-w-xs">
              <p className="text-sm text-white">
                Hi! I'm your AI fitness coach. I'm here to help you with workouts, nutrition, and any questions about your fitness journey. What can I help you with today?
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.isAI ? "" : "justify-end"
            }`}
          >
            {message.isAI && (
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
            )}
            
            <div
              className={`rounded-lg p-4 max-w-xs ${
                message.isAI
                  ? "bg-surface rounded-tl-none"
                  : "bg-primary-500 rounded-tr-none"
              }`}
            >
              <p className={`text-sm ${message.isAI ? "text-white" : "text-white"}`}>
                {message.message}
              </p>
              <span className={`text-xs mt-2 block ${
                message.isAI ? "text-gray-400" : "text-white/70"
              }`}>
                {formatTime(message.createdAt)}
                {message.metadata?.isVoice && (
                  <i className="fas fa-microphone ml-2"></i>
                )}
              </span>
            </div>
          </div>
        ))}

        {(sendMessageMutation.isPending || sendVoiceMutation.isPending) && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </div>
            <div className="bg-surface rounded-lg rounded-tl-none p-4 max-w-xs">
              <p className="text-sm text-white">AI Coach is typing...</p>
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
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full p-3 bg-dark border-gray-600 rounded-full pr-12 text-white placeholder-gray-400"
              disabled={sendMessageMutation.isPending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
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
