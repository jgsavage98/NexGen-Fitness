import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  RefreshControl,
  StatusBar,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  timezone?: string;
  programStartDate?: string;
  trainerId?: string;
  isTrainer?: boolean;
}

interface MacroTarget {
  id: number;
  userId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  isActive: boolean;
}

interface DailyMacros {
  id: number;
  userId: string;
  extractedCalories: number;
  extractedProtein: number;
  extractedCarbs: number;
  extractedFat: number;
  hungerLevel: number;
  energyLevel: number;
  recordedAt: string;
}

interface ChatMessage {
  id: string;
  message: string;
  is_ai: boolean;
  chat_type: string;
  created_at: string;
  user_id: string;
  metadata?: any;
  senderName?: string;
}

interface Workout {
  id: string;
  name: string;
  exercises: any[];
}

interface WeightEntry {
  id: string;
  weight: number;
  recordedAt: string;
}

type TabType = 'dashboard' | 'nutrition' | 'workout' | 'chat' | 'progress' | 'settings';
type ChatType = 'individual' | 'group';

interface ComprehensiveMigrationProps {
  apiUrl: string;
  onBack: () => void;
}

export default function ComprehensiveMigration({ apiUrl, onBack }: ComprehensiveMigrationProps) {
  // Core state
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showUserSelector, setShowUserSelector] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [macroTargets, setMacroTargets] = useState<MacroTarget | null>(null);
  const [dailyMacros, setDailyMacros] = useState<DailyMacros | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Chat states
  const [chatType, setChatType] = useState<ChatType>('individual');
  const [newMessage, setNewMessage] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);

  // Nutrition upload states
  const [nutritionText, setNutritionText] = useState('');
  const [hungerLevel, setHungerLevel] = useState('3');
  const [energyLevel, setEnergyLevel] = useState('3');

  // React Native compatible base64 encoding
  const base64Encode = (str: string): string => {
    // Simple base64 encoding for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += chars.charAt((bitmap >> 6) & 63);
      result += chars.charAt(bitmap & 63);
    }
    
    // Add padding
    const padding = str.length % 3;
    if (padding === 1) {
      result = result.slice(0, -2) + '==';
    } else if (padding === 2) {
      result = result.slice(0, -1) + '=';
    }
    
    return result;
  };

  // Get authentication token for API calls
  const getAuthToken = (userId: string): string => {
    // Create base64-encoded token in format expected by production API
    // Format: base64(userId:)
    const tokenData = `${userId}:`;
    const base64Token = base64Encode(tokenData);
    
    console.log(`Generating auth token for ${userId}:`);
    console.log(`Token data: "${tokenData}"`);
    console.log(`Base64 token: "${base64Token}"`);
    console.log(`Full header: "Bearer ${base64Token}"`);
    
    return `Bearer ${base64Token}`;
  };

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  // Auto-load chat messages when chatType or currentUser changes
  useEffect(() => {
    if (currentUser) {
      const headers = {
        'Authorization': getAuthToken(currentUser.id),
        'Content-Type': 'application/json',
      };
      console.log('useEffect triggered - loading chat messages for', currentUser.firstName, 'chatType:', chatType);
      loadChatMessages(currentUser, headers);
    }
  }, [chatType, currentUser]);

  // Load available users
  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/auth/available-users`);
      if (response.ok) {
        const rawUsers = await response.json();
        
        const processedUsers = rawUsers.map((user: any) => ({
          id: user.id,
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
          email: user.email,
          profileImageUrl: user.profile_image_url || user.profileImageUrl || '',
          timezone: user.timezone || 'America/New_York',
          programStartDate: user.program_start_date || user.programStartDate,
          trainerId: user.trainer_id || user.trainerId,
          isTrainer: user.id === (user.trainer_id || user.trainerId)
        }));
        
        setAvailableUsers(processedUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setShowUserSelector(false);
    loadUserData(user);
  };

  // Load user data
  const loadUserData = async (user: User) => {
    try {
      setLoading(true);
      
      const headers = {
        'Authorization': getAuthToken(user.id),
        'Content-Type': 'application/json',
      };

      if (user.isTrainer) {
        await loadTrainerData(user);
      } else {
        // Load macro targets
        try {
          const macroResponse = await fetch(`${apiUrl}/api/macro-targets`, { headers });
          if (macroResponse.ok) {
            const macroData = await macroResponse.json();
            setMacroTargets(macroData);
          }
        } catch (error) {
          console.log('Error loading macro targets:', error);
        }

        // Load daily macros
        try {
          const dailyResponse = await fetch(`${apiUrl}/api/daily-macros`, { headers });
          if (dailyResponse.ok) {
            const dailyData = await dailyResponse.json();
            setDailyMacros(dailyData);
          }
        } catch (error) {
          console.log('Error loading daily macros:', error);
        }

        // Load workouts
        try {
          const workoutResponse = await fetch(`${apiUrl}/api/workout/today`, { headers });
          if (workoutResponse.ok) {
            const workoutData = await workoutResponse.json();
            setWorkouts([workoutData]);
          }
        } catch (error) {
          console.log('Error loading workouts:', error);
        }

        // Load weight entries
        try {
          const weightResponse = await fetch(`${apiUrl}/api/progress/weight`, { headers });
          if (weightResponse.ok) {
            const weightData = await weightResponse.json();
            setWeightEntries(weightData);
          }
        } catch (error) {
          console.log('Error loading weight entries:', error);
        }
      }

      // Load chat messages and unread count
      console.log('Loading chat messages with headers:', headers);
      await loadChatMessages(user, headers);
      await loadUnreadCount(headers);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load trainer data
  const loadTrainerData = async (user: User) => {
    try {
      const clientUsers = availableUsers.filter((u: User) => !u.isTrainer);
      setClients(clientUsers);
      
      if (clientUsers.length > 0) {
        setSelectedClient(clientUsers[0]);
      }
    } catch (error) {
      console.error('Error loading trainer data:', error);
    }
  };

  // Load chat messages
  const loadChatMessages = async (user: User, headers: any) => {
    try {
      // Load both individual and group messages for current chat type
      const url = `${apiUrl}/api/chat/messages?chatType=${chatType}&limit=50`;

      console.log(`=== CHAT MESSAGE LOADING DEBUG ===`);
      console.log(`Loading ${chatType} chat messages from:`, url);
      console.log('Request headers:', headers);
      console.log('Full apiUrl:', apiUrl);
      console.log('User:', user.firstName, user.id);
      console.log('Current chatType:', chatType);
      
      console.log('About to make fetch request...');
      const startTime = Date.now();
      
      const chatResponse = await fetch(url, { 
        method: 'GET',
        headers: {
          ...headers,
          'Accept': 'application/json',
        }
      });
      
      const endTime = Date.now();
      console.log(`Fetch completed in ${endTime - startTime}ms`);
      console.log(`Chat response status: ${chatResponse.status}`);
      console.log(`Chat response headers:`, Object.fromEntries(chatResponse.headers.entries()));
      
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        console.log(`SUCCESS: Loaded ${chatData.length} ${chatType} messages:`, chatData);
        
        // Process messages to ensure proper format
        const processedMessages = chatData.map((msg: any) => ({
          id: msg.id,
          message: msg.message || msg.content,
          is_ai: msg.is_ai || msg.isFromCoach || false,
          chat_type: msg.chat_type || chatType,
          created_at: msg.created_at || msg.timestamp,
          user_id: msg.user_id || msg.userId,
          metadata: msg.metadata,
          senderName: msg.senderName || (msg.is_ai ? 'Coach Chassidy' : user.firstName)
        }));
        
        setChatMessages(processedMessages);
        console.log(`=== CHAT LOADING SUCCESS ===`);
      } else {
        const errorText = await chatResponse.text();
        console.error(`FAILED: Chat response not OK`);
        console.error(`Status: ${chatResponse.status}`);
        console.error(`Status Text: ${chatResponse.statusText}`);
        console.error(`Error body:`, errorText);
        Alert.alert('Error', `Failed to load ${chatType} chat messages: ${chatResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`=== CHAT LOADING ERROR ===`);
      console.error(`Error type:`, error.constructor.name);
      console.error(`Error message:`, error.message);
      console.error(`Full error:`, error);
      Alert.alert('Error', `Failed to load ${chatType} chat messages: ${error.message || 'Network error'}`);
    }
  };

  // Load unread count
  const loadUnreadCount = async (headers: any) => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/unread-count`, { headers });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.log('Error loading unread count:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const headers = {
        'Authorization': getAuthToken(currentUser?.id || ''),
        'Content-Type': 'application/json',
      };

      const endpoint = chatType === 'individual' ? '/api/chat/messages' : '/api/chat/group-messages';
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: newMessage,
          chat_type: chatType,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await loadChatMessages(currentUser!, headers);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // Submit nutrition
  const submitNutrition = async () => {
    if (!nutritionText.trim()) {
      Alert.alert('Error', 'Please enter your nutrition information');
      return;
    }

    try {
      const headers = {
        'Authorization': getAuthToken(currentUser?.id || ''),
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/upload/nutrition`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: nutritionText,
          hungerLevel: parseInt(hungerLevel),
          energyLevel: parseInt(energyLevel),
        }),
      });

      if (response.ok) {
        setNutritionText('');
        setHungerLevel('3');
        setEnergyLevel('3');
        Alert.alert('Success', 'Nutrition uploaded successfully!');
        // Reload daily macros
        if (currentUser) {
          loadUserData(currentUser);
        }
      } else {
        Alert.alert('Error', 'Failed to upload nutrition');
      }
    } catch (error) {
      console.error('Error uploading nutrition:', error);
      Alert.alert('Error', 'Failed to upload nutrition');
    }
  };

  // Get profile image URL
  const getProfileImageUrl = (user: User) => {
    if (!user?.profileImageUrl) return '';
    
    if (user.profileImageUrl.startsWith('http')) {
      return user.profileImageUrl;
    } else if (user.profileImageUrl.startsWith('/attached_assets/')) {
      return `${apiUrl}${user.profileImageUrl}`;
    } else if (user.profileImageUrl.startsWith('/screenshots/')) {
      return `${apiUrl}${user.profileImageUrl}`;
    } else if (user.profileImageUrl.startsWith('screenshots/')) {
      return `${apiUrl}/${user.profileImageUrl}`;
    } else if (user.profileImageUrl.startsWith('/')) {
      return `${apiUrl}${user.profileImageUrl}`;
    } else {
      return `${apiUrl}/screenshots/${user.profileImageUrl}`;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  // Render user selector
  const renderUserSelector = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select User</Text>
        <Text style={styles.subtitle}>Choose an account to continue</Text>
      </View>
      
      <ScrollView style={styles.userList}>
        {availableUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userItem}
            onPress={() => handleUserSelect(user)}
          >
            <View style={styles.userInfo}>
              {user.profileImageUrl ? (
                <Image
                  source={{ uri: getProfileImageUrl(user) }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarText}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </Text>
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user.firstName} {user.lastName}
                  {user.isTrainer && ' (Trainer)'}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  // Render header
  const renderHeader = () => (
    <View style={styles.mainHeader}>
      <TouchableOpacity onPress={() => setShowUserSelector(true)} style={styles.profileSection}>
        {currentUser?.profileImageUrl ? (
          <Image
            source={{ uri: getProfileImageUrl(currentUser) }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>
              {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
            </Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {currentUser?.firstName} {currentUser?.lastName}
          </Text>
          <Text style={styles.profileRole}>
            {currentUser?.isTrainer ? 'Trainer Dashboard' : 'Client Dashboard'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Render dashboard tab
  const renderDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => currentUser && loadUserData(currentUser)} />
      }
    >
      {currentUser?.isTrainer ? (
        // Trainer dashboard
        <View>
          <Text style={styles.sectionTitle}>Coach Dashboard</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Client Overview</Text>
            {clients.map((client) => (
              <View key={client.id} style={styles.clientRow}>
                {client.profileImageUrl ? (
                  <Image
                    source={{ uri: getProfileImageUrl(client) }}
                    style={styles.clientAvatar}
                  />
                ) : (
                  <View style={styles.clientAvatarPlaceholder}>
                    <Text style={styles.clientAvatarText}>
                      {client.firstName?.[0]}{client.lastName?.[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.clientName}>
                  {client.firstName} {client.lastName}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        // Client dashboard
        <View>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          
          {/* Macro targets card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macro Targets</Text>
            {macroTargets ? (
              <View>
                <Text style={styles.macroText}>Calories: {macroTargets.calories}</Text>
                <Text style={styles.macroText}>Protein: {macroTargets.protein}g</Text>
                <Text style={styles.macroText}>Carbs: {macroTargets.carbs}g</Text>
                <Text style={styles.macroText}>Fat: {macroTargets.fat}g</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>No macro targets set</Text>
            )}
          </View>

          {/* Daily macros card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Nutrition</Text>
            {dailyMacros ? (
              <View>
                <Text style={styles.macroText}>Calories: {dailyMacros.extractedCalories}</Text>
                <Text style={styles.macroText}>Protein: {dailyMacros.extractedProtein}g</Text>
                <Text style={styles.macroText}>Carbs: {dailyMacros.extractedCarbs}g</Text>
                <Text style={styles.macroText}>Fat: {dailyMacros.extractedFat}g</Text>
                <Text style={styles.macroText}>Hunger: {dailyMacros.hungerLevel}/5</Text>
                <Text style={styles.macroText}>Energy: {dailyMacros.energyLevel}/5</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>No nutrition uploaded today</Text>
            )}
          </View>

          {/* Workout card */}
          <TouchableOpacity style={styles.card} onPress={() => setActiveTab('workout')}>
            <Text style={styles.cardTitle}>Today's Workout</Text>
            {workouts.length > 0 ? (
              <Text style={styles.workoutName}>{workouts[0].name}</Text>
            ) : (
              <Text style={styles.emptyText}>No workout assigned</Text>
            )}
          </TouchableOpacity>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('nutrition')}
            >
              <Text style={styles.quickActionText}>📸 Upload Nutrition</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setActiveTab('chat')}
            >
              <Text style={styles.quickActionText}>💬 Chat</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );

  // Render nutrition tab
  const renderNutrition = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Upload Nutrition</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nutrition Information</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe your meals, calories, macros, or upload a photo description..."
          placeholderTextColor="#666"
          value={nutritionText}
          onChangeText={setNutritionText}
          multiline
          numberOfLines={6}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wellness Levels</Text>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Hunger Level (1-5):</Text>
          <TextInput
            style={styles.levelInput}
            value={hungerLevel}
            onChangeText={setHungerLevel}
            keyboardType="numeric"
            maxLength={1}
          />
        </View>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Energy Level (1-5):</Text>
          <TextInput
            style={styles.levelInput}
            value={energyLevel}
            onChangeText={setEnergyLevel}
            keyboardType="numeric"
            maxLength={1}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={submitNutrition}>
        <Text style={styles.submitButtonText}>Upload Nutrition</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render workout tab
  const renderWorkout = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Today's Workout</Text>
      
      {workouts.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{workouts[0].name}</Text>
          {workouts[0].exercises?.map((exercise: any, index: number) => (
            <View key={index} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDetails}>
                {exercise.sets} sets × {exercise.reps} reps
              </Text>
            </View>
          )) || <Text style={styles.emptyText}>No exercises details available</Text>}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No workout assigned for today</Text>
        </View>
      )}
    </ScrollView>
  );

  // Render chat tab
  const renderChat = () => (
    <View style={styles.chatContainer}>
      <View style={styles.chatTypeSelector}>
        <TouchableOpacity
          style={[styles.chatTypeTab, chatType === 'individual' && styles.activeChatTypeTab]}
          onPress={() => {
            setChatType('individual');
            // Reload messages when switching chat type
            if (currentUser) {
              const headers = {
                'Authorization': `Bearer mock-${currentUser.id}-token`,
                'Content-Type': 'application/json',
              };
              setTimeout(() => loadChatMessages(currentUser, headers), 100);
            }
          }}
        >
          <Text style={[styles.chatTypeText, chatType === 'individual' && styles.activeChatTypeText]}>
            Individual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatTypeTab, chatType === 'group' && styles.activeChatTypeTab]}
          onPress={() => {
            setChatType('group');
            // Reload messages when switching chat type
            if (currentUser) {
              const headers = {
                'Authorization': `Bearer mock-${currentUser.id}-token`,
                'Content-Type': 'application/json',
              };
              setTimeout(() => loadChatMessages(currentUser, headers), 100);
            }
          }}
        >
          <Text style={[styles.chatTypeText, chatType === 'group' && styles.activeChatTypeText]}>
            Group
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.chatMessages}>
        {chatMessages.length > 0 ? (
          chatMessages.map((message) => (
            <View key={message.id} style={styles.messageRow}>
              <Text style={styles.messageSender}>
                {message.senderName || (message.is_ai ? 'Coach Chassidy' : 'You')}
              </Text>
              <Text style={styles.messageText}>{message.message}</Text>
              <Text style={styles.messageTime}>{formatTime(message.created_at)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyMessageContainer}>
            <Text style={styles.emptyText}>
              {chatType === 'individual' 
                ? 'No individual messages yet. Start a conversation!'
                : 'No group messages yet. Join the discussion!'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.messageInput}>
        <TextInput
          style={styles.messageTextInput}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render progress tab
  const renderProgress = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Progress Tracking</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weight Progress</Text>
        {weightEntries.length > 0 ? (
          weightEntries.slice(0, 5).map((entry) => (
            <View key={entry.id} style={styles.progressRow}>
              <Text style={styles.progressDate}>{formatDate(entry.recordedAt)}</Text>
              <Text style={styles.progressWeight}>{entry.weight} lbs</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No weight entries recorded</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Uploads</Text>
        <Text style={styles.emptyText}>Upload history coming soon</Text>
      </View>
    </ScrollView>
  );

  // Render settings tab
  const renderSettings = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Settings</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => setShowUserSelector(true)}>
          <Text style={styles.settingText}>Switch Account</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Name: {currentUser?.firstName} {currentUser?.lastName}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Email: {currentUser?.email}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Timezone: {currentUser?.timezone}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => setShowUserSelector(true)}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render bottom navigation
  const renderBottomNav = () => {
    const tabs = currentUser?.isTrainer 
      ? [
          { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
          { key: 'chat', icon: '💬', label: 'Chat' },
          { key: 'settings', icon: '⚙️', label: 'Settings' }
        ]
      : [
          { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
          { key: 'nutrition', icon: '🍎', label: 'Nutrition' },
          { key: 'workout', icon: '💪', label: 'Workout' },
          { key: 'chat', icon: '💬', label: 'Chat' },
          { key: 'progress', icon: '📈', label: 'Progress' },
          { key: 'settings', icon: '⚙️', label: 'Settings' }
        ];

    return (
      <View style={styles.bottomNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                onPress={() => {
                  setActiveTab(tab.key as TabType);
                  // Reload chat messages when switching to chat tab
                  if (tab.key === 'chat' && currentUser) {
                    const headers = {
                      'Authorization': `Bearer mock-${currentUser.id}-token`,
                      'Content-Type': 'application/json',
                    };
                    loadChatMessages(currentUser, headers);
                  }
                }}
              >
                <Text style={[styles.tabIcon, activeTab === tab.key && styles.activeTabIcon]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
                {tab.key === 'chat' && unreadCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'nutrition':
        return renderNutrition();
      case 'workout':
        return renderWorkout();
      case 'chat':
        return renderChat();
      case 'progress':
        return renderProgress();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  // Show user selector if no user selected
  if (showUserSelector || !currentUser) {
    return renderUserSelector();
  }

  // Main app interface
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      {renderHeader()}
      <View style={styles.mainContent}>
        {renderTabContent()}
      </View>
      {renderBottomNav()}
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 1,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  userList: {
    flex: 1,
    padding: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  chevron: {
    color: '#888',
    fontSize: 20,
  },
  mainHeader: {
    backgroundColor: '#2a2a2a',
    padding: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileImageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileRole: {
    color: '#888',
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  macroText: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 4,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  workoutName: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#3a3a3a',
    padding: 16,
    borderRadius: 12,
    flex: 0.48,
    alignItems: 'center',
    position: 'relative',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  clientAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  clientAvatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientName: {
    color: '#ddd',
    fontSize: 14,
  },
  textArea: {
    backgroundColor: '#3a3a3a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelLabel: {
    color: '#ddd',
    fontSize: 14,
  },
  levelInput: {
    backgroundColor: '#3a3a3a',
    color: '#fff',
    padding: 8,
    borderRadius: 6,
    fontSize: 14,
    width: 50,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseRow: {
    marginBottom: 8,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseDetails: {
    color: '#888',
    fontSize: 12,
  },
  chatContainer: {
    flex: 1,
  },
  chatTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    margin: 16,
    borderRadius: 8,
  },
  chatTypeTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeChatTypeTab: {
    backgroundColor: '#4CAF50',
  },
  chatTypeText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  activeChatTypeText: {
    color: '#fff',
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  messageRow: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  messageSender: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  messageTime: {
    color: '#888',
    fontSize: 12,
  },
  messageInput: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'flex-end',
  },
  messageTextInput: {
    flex: 1,
    backgroundColor: '#3a3a3a',
    color: '#fff',
    padding: 12,
    borderRadius: 20,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDate: {
    color: '#888',
    fontSize: 14,
  },
  progressWeight: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingText: {
    color: '#ddd',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 2,
    position: 'relative',
    alignItems: 'center',
    minWidth: 70,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  activeTabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#fff',
  },
  tabBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});