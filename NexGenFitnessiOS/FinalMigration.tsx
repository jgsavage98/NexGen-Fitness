import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  FlatList,
  Modal,
} from 'react-native';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  timezone?: string;
  programStartDate?: string;
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

type TabType = 'dashboard' | 'nutrition' | 'workout' | 'chat' | 'progress' | 'trainer';
type ChatType = 'individual' | 'group';

interface FinalMigrationProps {
  apiUrl: string;
  onBack: () => void;
}

export default function FinalMigration({ apiUrl, onBack }: FinalMigrationProps) {
  // User and app state
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showUserSelector, setShowUserSelector] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');

  // Data states
  const [macroTargets, setMacroTargets] = useState<MacroTarget | null>(null);
  const [dailyMacros, setDailyMacros] = useState<DailyMacros[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Chat states
  const [chatType, setChatType] = useState<ChatType>('individual');
  const [newMessage, setNewMessage] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/auth/available-users`);
      if (response.ok) {
        const users = await response.json();
        console.log('Loaded users:', users);
        setAvailableUsers(users);
      } else {
        console.error('Failed to load users from API');
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setShowUserSelector(false);
    loadUserData(user);
  };

  const loadUserData = async (user: User) => {
    try {
      setLoading(true);
      
      // Set auth token (simulate login)
      const token = `Bearer mock-${user.id}-token`;
      setAuthToken(token);

      const headers = {
        'Authorization': token,
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
      }

      // Load chat messages
      await loadChatMessages(user, headers);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainerData = async (user: User) => {
    try {
      const headers = {
        'Authorization': `Bearer mock-${user.id}-token`,
        'Content-Type': 'application/json',
      };

      // Load all users for trainer
      const allUsers = availableUsers.filter((u: User) => !u.isTrainer);
      setClients(allUsers);
      
      if (allUsers.length > 0) {
        setSelectedClient(allUsers[0]);
      }
    } catch (error) {
      console.error('Error loading trainer data:', error);
    }
  };

  const loadChatMessages = async (user: User, headers: any) => {
    try {
      let url = '';
      if (chatType === 'individual') {
        url = `${apiUrl}/api/chat/messages`;
      } else {
        url = `${apiUrl}/api/chat/group-messages`;
      }

      const chatResponse = await fetch(url, { headers });
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        console.log(`Loaded ${chatType} chat messages:`, chatData.length);
        setChatMessages(chatData);
      }
    } catch (error) {
      console.log(`Error loading ${chatType} chat messages:`, error);
    }
  };

  const getProfileImageUrl = (user: User) => {
    if (!user?.profileImageUrl) return '';
    
    // Handle different URL formats
    if (user.profileImageUrl.startsWith('http')) {
      return user.profileImageUrl;
    } else if (user.profileImageUrl.startsWith('/')) {
      return `${apiUrl}${user.profileImageUrl}`;
    } else {
      return `${apiUrl}/screenshots/${user.profileImageUrl}`;
    }
  };

  const renderUserSelector = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.header}>
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
                  onError={(error) => {
                    console.log('Error loading profile image for', user.firstName, ':', error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded profile image for', user.firstName);
                  }}
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => setShowUserSelector(true)} style={styles.profileSection}>
        {currentUser?.profileImageUrl ? (
          <Image
            source={{ uri: getProfileImageUrl(currentUser) }}
            style={styles.profileImage}
            onError={(error) => {
              console.log('Error loading header profile image:', error.nativeEvent.error);
            }}
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

  const renderTrainerDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {}} />
      }
    >
      <Text style={styles.sectionTitle}>Coach Chassidy Dashboard</Text>
      
      <View style={styles.trainerSection}>
        <Text style={styles.trainerSectionTitle}>Client Overview</Text>
        {clients.map((client) => (
          <View key={client.id} style={styles.clientCard}>
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

      <View style={styles.trainerSection}>
        <Text style={styles.trainerSectionTitle}>Chat Management</Text>
        <TouchableOpacity 
          style={styles.chatTypeButton}
          onPress={() => {
            setChatType('individual');
            setActiveTab('chat');
          }}
        >
          <Text style={styles.chatTypeButtonText}>Individual Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.chatTypeButton}
          onPress={() => {
            setChatType('group');
            setActiveTab('chat');
          }}
        >
          <Text style={styles.chatTypeButtonText}>Group Chat</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {}} />
      }
    >
      <Text style={styles.sectionTitle}>Dashboard</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Progress</Text>
        <Text style={styles.cardContent}>
          Macros: {dailyMacros.length > 0 ? 'Logged' : 'Not logged today'}
        </Text>
        <Text style={styles.cardContent}>
          Workout: {workouts.length > 0 ? 'Completed' : 'Pending'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Goals</Text>
        {macroTargets ? (
          <>
            <Text style={styles.cardContent}>Calories: {macroTargets.calories}</Text>
            <Text style={styles.cardContent}>Protein: {macroTargets.protein}g</Text>
            <Text style={styles.cardContent}>Carbs: {macroTargets.carbs}g</Text>
            <Text style={styles.cardContent}>Fat: {macroTargets.fat}g</Text>
          </>
        ) : (
          <Text style={styles.cardContent}>No macro targets set</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderNutrition = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Nutrition</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Macros</Text>
        {dailyMacros.length > 0 ? (
          dailyMacros.map((macro, index) => (
            <View key={index} style={styles.macroEntry}>
              <Text style={styles.cardContent}>Calories: {macro.extractedCalories}</Text>
              <Text style={styles.cardContent}>Protein: {macro.extractedProtein}g</Text>
              <Text style={styles.cardContent}>Carbs: {macro.extractedCarbs}g</Text>
              <Text style={styles.cardContent}>Fat: {macro.extractedFat}g</Text>
            </View>
          ))
        ) : (
          <Text style={styles.cardContent}>No macros logged today</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderWorkout = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Workout</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Workout</Text>
        {workouts.length > 0 ? (
          workouts.map((workout, index) => (
            <View key={index}>
              <Text style={styles.cardContent}>Name: {workout.name}</Text>
              <Text style={styles.cardContent}>Exercises: {workout.exercises?.length || 0}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.cardContent}>No workout scheduled</Text>
        )}
      </View>
    </ScrollView>
  );

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const headers = {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      };

      const url = chatType === 'individual' 
        ? `${apiUrl}/api/chat/messages`
        : `${apiUrl}/api/chat/group-messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: newMessage,
          chatType: chatType,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Reload messages
        await loadChatMessages(currentUser!, headers);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderChat = () => (
    <View style={styles.chatContainer}>
      <View style={styles.chatHeader}>
        <Text style={styles.sectionTitle}>
          {chatType === 'individual' ? 'Coach Chat' : 'Group Chat'}
        </Text>
        <View style={styles.chatTypeSelector}>
          <TouchableOpacity
            style={[styles.chatTypeTab, chatType === 'individual' && styles.activeTab]}
            onPress={() => {
              setChatType('individual');
              if (currentUser) loadChatMessages(currentUser, { 'Authorization': authToken });
            }}
          >
            <Text style={[styles.chatTypeTabText, chatType === 'individual' && styles.activeTabText]}>
              Individual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chatTypeTab, chatType === 'group' && styles.activeTab]}
            onPress={() => {
              setChatType('group');
              if (currentUser) loadChatMessages(currentUser, { 'Authorization': authToken });
            }}
          >
            <Text style={[styles.chatTypeTabText, chatType === 'group' && styles.activeTabText]}>
              Group
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={chatMessages}
        style={styles.messagesList}
        renderItem={({ item }) => (
          <View style={[styles.message, item.is_ai ? styles.aiMessage : styles.userMessage]}>
            <Text style={styles.senderName}>
              {item.is_ai ? 'Coach Chassidy' : currentUser?.firstName || 'You'}
            </Text>
            <Text style={styles.messageText}>{item.message}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleTimeString()}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        inverted
      />

      <View style={styles.messageInput}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProgress = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Progress</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weight Progress</Text>
        <Text style={styles.cardContent}>Coming soon...</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Macro Adherence</Text>
        <Text style={styles.cardContent}>
          Days logged: {dailyMacros.length}
        </Text>
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    if (currentUser?.isTrainer && activeTab === 'trainer') {
      return renderTrainerDashboard();
    }

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
      default:
        return renderDashboard();
    }
  };

  const renderBottomNavigation = () => {
    const tabs = currentUser?.isTrainer 
      ? [
          { key: 'dashboard', label: 'Dashboard', icon: '📊' },
          { key: 'chat', label: 'Chat', icon: '💬' },
          { key: 'trainer', label: 'Trainer', icon: '👨‍🏫' },
        ]
      : [
          { key: 'dashboard', label: 'Dashboard', icon: '📊' },
          { key: 'nutrition', label: 'Nutrition', icon: '🍎' },
          { key: 'workout', label: 'Workout', icon: '💪' },
          { key: 'chat', label: 'Chat', icon: '💬' },
          { key: 'progress', label: 'Progress', icon: '📈' },
        ];

    return (
      <View style={styles.bottomNav}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.navItem, activeTab === tab.key && styles.activeNavItem]}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={[styles.navLabel, activeTab === tab.key && styles.activeNavLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (showUserSelector) {
    return renderUserSelector();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      {renderHeader()}
      {renderTabContent()}
      {renderBottomNavigation()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4a4a4a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileRole: {
    fontSize: 14,
    color: '#ccc',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
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
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
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
    marginRight: 15,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4a4a4a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#ccc',
  },
  chevron: {
    fontSize: 18,
    color: '#ccc',
  },
  macroEntry: {
    marginBottom: 10,
  },
  trainerSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  trainerSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  clientAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a4a4a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  clientAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 14,
    color: '#fff',
  },
  chatTypeButton: {
    backgroundColor: '#4a4a4a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  chatTypeButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  chatTypeSelector: {
    flexDirection: 'row',
    marginTop: 10,
  },
  chatTypeTab: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#4a4a4a',
  },
  chatTypeTabText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 14,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  message: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    maxWidth: '85%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#3a3a3a',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ccc',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  messageInput: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    backgroundColor: '#4a4a4a',
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 12,
    color: '#ccc',
  },
  activeNavLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});