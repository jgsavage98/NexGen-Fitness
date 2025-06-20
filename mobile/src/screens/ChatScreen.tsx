import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatMessage {
  id: number;
  message: string;
  isAI: boolean;
  userId: string;
  createdAt: string;
  metadata?: {
    targetUserId?: string;
  };
}

export default function ChatScreen() {
  const {user} = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    
    // Mark messages as read when screen is opened
    markMessagesAsRead();
    
    // Set up polling for new messages (replace with WebSocket in production)
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Cookie': `auth_token=${token}`,
      'Content-Type': 'application/json',
    };
  };

  const loadMessages = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/chat/individual-messages`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.reverse()); // Reverse to show newest at bottom
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE_URL}/api/chat/individual-messages/mark-read`, {
        method: 'POST',
        headers,
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const messageText = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageText,
          chatType: 'individual',
        }),
      });

      if (response.ok) {
        // Reload messages to get the new message and any AI response
        setTimeout(() => {
          loadMessages();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const isCoachMessage = (message: ChatMessage) => {
    return message.isAI || message.userId === 'coach_chassidy';
  };

  const renderMessage = ({item}: {item: ChatMessage}) => {
    const isFromCoach = isCoachMessage(item);
    const isFromCurrentUser = item.userId === user?.id && !item.isAI;

    return (
      <View style={[
        styles.messageContainer,
        isFromCurrentUser ? styles.userMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isFromCurrentUser ? styles.userMessage : styles.coachMessage
        ]}>
          {isFromCoach && (
            <Text style={styles.senderName}>Coach Chassidy</Text>
          )}
          <Text style={[
            styles.messageText,
            isFromCurrentUser ? styles.userMessageText : styles.coachMessageText
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.timestamp,
            isFromCurrentUser ? styles.userTimestamp : styles.coachTimestamp
          ]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat with Coach Chassidy</Text>
          <Text style={styles.headerSubtitle}>Your AI-powered fitness coach</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  coachMessage: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  coachMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  coachTimestamp: {
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});