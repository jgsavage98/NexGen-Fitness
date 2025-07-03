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
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
  timezone?: string;
  program_start_date?: string;
  is_trainer?: boolean;
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
  const [showUserSelector, setShowUserSelector] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Data state
  const [macroTargets, setMacroTargets] = useState<MacroTarget | null>(null);
  const [dailyMacros, setDailyMacros] = useState<DailyMacros | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Chat state
  const [activeChatType, setActiveChatType] = useState<ChatType>('individual');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Trainer dashboard state
  const [clients, setClients] = useState<User[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/available-users`);
      if (response.ok) {
        const users = await response.json();
        console.log('Loaded users:', users);
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    console.log('Selected user:', user);
    setCurrentUser(user);
    setShowUserSelector(false);
    
    // Determine tab layout based on user type
    if (user.id === 'coach_chassidy') {
      setActiveTab('trainer');
      loadTrainerData(user);
    } else {
      setActiveTab('dashboard');
      loadUserData(user);
    }
  };

  const loadUserData = async (user: User) => {
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`,
      };

      console.log('Loading data for user:', user.id);

      // Load macro targets
      try {
        const macroResponse = await fetch(`${apiUrl}/api/macro-targets`, { headers });
        if (macroResponse.ok) {
          const macroData = await macroResponse.json();
          setMacroTargets(macroData);
          console.log('Loaded macro targets:', macroData);
        }
      } catch (error) {
        console.error('Error loading macro targets:', error);
      }

      // Load daily macros
      try {
        const dailyResponse = await fetch(`${apiUrl}/api/daily-macros`, { headers });
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          setDailyMacros(dailyData);
          console.log('Loaded daily macros:', dailyData);
        }
      } catch (error) {
        console.error('Error loading daily macros:', error);
      }

      // Load workout
      try {
        const workoutResponse = await fetch(`${apiUrl}/api/workout/today`, { headers });
        if (workoutResponse.ok) {
          const workoutData = await workoutResponse.json();
          setWorkout(workoutData);
          console.log('Loaded workout:', workoutData);
        }
      } catch (error) {
        console.error('Error loading workout:', error);
      }

      // Load unread count
      try {
        const unreadResponse = await fetch(`${apiUrl}/api/chat/unread-count`, { headers });
        if (unreadResponse.ok) {
          const unreadData = await unreadResponse.json();
          setUnreadCount(unreadData.count || 0);
          console.log('Loaded unread count:', unreadData.count);
        }
      } catch (error) {
        console.error('Error loading unread count:', error);
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
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`,
      };

      console.log('Loading trainer data for:', user.id);

      // Load all users to show as clients
      try {
        const clientsResponse = await fetch(`${apiUrl}/api/auth/available-users`, { headers });
        if (clientsResponse.ok) {
          const allUsers = await clientsResponse.json();
          const clientUsers = allUsers.filter((u: User) => u.id !== 'coach_chassidy');
          setClients(clientUsers);
          console.log('Loaded clients:', clientUsers);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }

      // Load chat messages for trainer
      await loadChatMessages(user, headers);

    } catch (error) {
      console.error('Error loading trainer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (user: User, headers: any) => {
    try {
      console.log('Loading chat messages for chatType:', activeChatType);
      
      const response = await fetch(`${apiUrl}/api/chat/messages?chatType=${activeChatType}&limit=50`, { headers });
      if (response.ok) {
        const messages = await response.json();
        console.log('Raw API response for chat messages:', messages);
        
        // Transform messages to expected format
        const transformedMessages = messages.map((msg: any) => ({
          id: msg.id?.toString() || Math.random().toString(),
          message: msg.message || msg.content || '',
          is_ai: msg.is_ai || msg.isFromCoach || false,
          chat_type: msg.chat_type || activeChatType,
          created_at: msg.created_at || msg.timestamp || new Date().toISOString(),
          user_id: msg.user_id || msg.userId || user.id,
          metadata: msg.metadata || {},
          senderName: msg.is_ai ? 'Coach Chassidy' : `${user.first_name} ${user.last_name}`
        }));
        
        setChatMessages(transformedMessages);
        console.log('Transformed chat messages:', transformedMessages);
      } else {
        console.error('Failed to load chat messages, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.id}`,
      };

      console.log('Sending message:', { content: newMessage, chatType: activeChatType });

      const response = await fetch(`${apiUrl}/api/chat/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: newMessage,
          message: newMessage,
          chatType: activeChatType,
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await loadChatMessages(currentUser, headers);
        console.log('Message sent successfully');
      } else {
        console.error('Failed to send message, status:', response.status);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onRefresh = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    if (currentUser.id === 'coach_chassidy') {
      await loadTrainerData(currentUser);
    } else {
      await loadUserData(currentUser);
    }
    setRefreshing(false);
  };

  const getProfileImageUrl = (user: User) => {
    if (!user.profile_image_url) return null;
    
    let imageUrl = user.profile_image_url;
    
    // Handle different URL formats from database
    if (imageUrl.startsWith('/')) {
      imageUrl = imageUrl.slice(1);
    }
    
    const fullUrl = `${apiUrl}/${imageUrl}`;
    console.log('Profile image URL for', user.first_name, ':', fullUrl);
    return fullUrl;
  };

  const renderUserSelector = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Select User Account</Text>
      </View>
      <ScrollView style={styles.userList}>
        {availableUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userItem}
            onPress={() => handleUserSelect(user)}
          >
            <View style={styles.userInfo}>
              {user.profile_image_url ? (
                <Image
                  source={{ uri: getProfileImageUrl(user) }}
                  style={styles.userAvatar}
                  onError={(error) => {
                    console.log('Error loading profile image for', user.first_name, ':', error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded profile image for', user.first_name);
                  }}
                />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarText}>
                    {user.first_name[0]}{user.last_name[0]}
                  </Text>
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user.first_name} {user.last_name}
                  {user.is_trainer && ' (Trainer)'}
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
        {currentUser?.profile_image_url ? (
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
              {currentUser?.first_name[0]}{currentUser?.last_name[0]}
            </Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {currentUser?.first_name} {currentUser?.last_name}
          </Text>
          <Text style={styles.profileRole}>
            {currentUser?.is_trainer ? 'Trainer Dashboard' : 'Client Dashboard'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderTrainerDashboard = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={styles.tabTitle}>👨‍💼 Trainer Dashboard</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coach Chassidy's Control Panel</Text>
        <Text style={styles.cardDescription}>
          Managing {clients.length} active clients with AI-powered coaching
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Clients ({clients.length})</Text>
        {clients.map((client) => (
          <View key={client.id} style={styles.clientItem}>
            {client.profile_image_url ? (
              <Image
                source={{ uri: getProfileImageUrl(client) }}
                style={styles.clientAvatar}
                onError={(error) => {
                  console.log('Error loading client avatar:', error.nativeEvent.error);
                }}
              />
            ) : (
              <View style={styles.clientAvatarPlaceholder}>
                <Text style={styles.clientAvatarText}>
                  {client.first_name[0]}{client.last_name[0]}
                </Text>
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.first_name} {client.last_name}</Text>
              <Text style={styles.clientEmail}>{client.email}</Text>
            </View>
            <View style={styles.clientStatus}>
              <Text style={styles.clientStatusText}>Active</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Coach Tools</Text>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>📊 Weekly Check-ins</Text>
          <Text style={styles.toolButtonDesc}>Automated progress reviews</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>⚙️ AI Settings</Text>
          <Text style={styles.toolButtonDesc}>Customize automation & responses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>📈 Client Progress</Text>
          <Text style={styles.toolButtonDesc}>View all client metrics</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDashboard = () => {
    if (currentUser?.id === 'coach_chassidy') {
      return renderTrainerDashboard();
    }

    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <Text style={styles.tabTitle}>🏠 Dashboard</Text>
        
        {/* Macro Progress Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Macros</Text>
          {macroTargets ? (
            <View style={styles.macroSection}>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Calories</Text>
                <Text style={styles.macroValue}>
                  {dailyMacros?.extractedCalories || 0} / {macroTargets.calories}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min(100, (dailyMacros?.extractedCalories || 0) / macroTargets.calories * 100)}%`,
                    backgroundColor: '#4CAF50'
                  }
                ]} />
              </View>

              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>
                  {dailyMacros?.extractedProtein || 0}g / {macroTargets.protein}g
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min(100, (dailyMacros?.extractedProtein || 0) / macroTargets.protein * 100)}%`,
                    backgroundColor: '#2196F3'
                  }
                ]} />
              </View>

              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>
                  {dailyMacros?.extractedCarbs || 0}g / {macroTargets.carbs}g
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min(100, (dailyMacros?.extractedCarbs || 0) / macroTargets.carbs * 100)}%`,
                    backgroundColor: '#FF9800'
                  }
                ]} />
              </View>

              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>
                  {dailyMacros?.extractedFat || 0}g / {macroTargets.fat}g
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min(100, (dailyMacros?.extractedFat || 0) / macroTargets.fat * 100)}%`,
                    backgroundColor: '#9C27B0'
                  }
                ]} />
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No macro targets set</Text>
          )}
        </View>

        {/* Workout Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Workout</Text>
          <Text style={styles.workoutName}>{workout?.name || 'No workout assigned'}</Text>
        </View>
      </ScrollView>
    );
  };

  const renderChatMessages = () => {
    return (
      <View style={styles.chatContainer}>
        {/* Chat Type Selector */}
        <View style={styles.chatTypeSelector}>
          <TouchableOpacity
            style={[
              styles.chatTypeButton,
              activeChatType === 'individual' && styles.chatTypeButtonActive
            ]}
            onPress={() => {
              setActiveChatType('individual');
              if (currentUser) {
                const headers = {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${currentUser.id}`,
                };
                loadChatMessages(currentUser, headers);
              }
            }}
          >
            <Text style={[
              styles.chatTypeText,
              activeChatType === 'individual' && styles.chatTypeTextActive
            ]}>
              Individual Coach
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chatTypeButton,
              activeChatType === 'group' && styles.chatTypeButtonActive
            ]}
            onPress={() => {
              setActiveChatType('group');
              if (currentUser) {
                const headers = {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${currentUser.id}`,
                };
                loadChatMessages(currentUser, headers);
              }
            }}
          >
            <Text style={[
              styles.chatTypeText,
              activeChatType === 'group' && styles.chatTypeTextActive
            ]}>
              Group Chat
            </Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView style={styles.messagesContainer} ref={scrollViewRef}>
          {chatMessages.length > 0 ? (
            chatMessages.map((message, index) => (
              <View key={`${message.id}-${index}`} style={styles.messageItem}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>
                    {message.is_ai ? 'Coach Chassidy' : message.senderName || `${currentUser?.first_name} ${currentUser?.last_name}`}
                  </Text>
                  <Text style={styles.messageTime}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.messageContent}>{message.message}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyMessagesContainer}>
              <Text style={styles.emptyMessagesText}>
                No messages in {activeChatType} chat yet
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={() => {
                  if (currentUser) {
                    const headers = {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${currentUser.id}`,
                    };
                    loadChatMessages(currentUser, headers);
                  }
                }}
              >
                <Text style={styles.refreshButtonText}>Refresh Messages</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Message Input */}
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={`Message ${activeChatType} chat...`}
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'trainer':
        return renderDashboard();
      case 'chat':
        return renderChatMessages();
      case 'nutrition':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>📸 Nutrition Upload</Text>
            <Text style={styles.tabDescription}>Take a photo of your meal to track macros</Text>
          </View>
        );
      case 'workout':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>💪 Today's Workout</Text>
            <Text style={styles.tabDescription}>{workout?.name || 'No workout assigned'}</Text>
          </View>
        );
      case 'progress':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>📈 Progress Tracking</Text>
            <Text style={styles.tabDescription}>Your weight and measurement history</Text>
          </View>
        );
      default:
        return renderDashboard();
    }
  };

  const getTabsForUser = () => {
    if (currentUser?.id === 'coach_chassidy') {
      return [
        { key: 'trainer', icon: '👨‍💼', label: 'Dashboard' },
        { key: 'chat', icon: '💬', label: 'Chat' },
      ];
    }
    
    return [
      { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { key: 'nutrition', icon: '📸', label: 'Nutrition' },
      { key: 'workout', icon: '💪', label: 'Workout' },
      { key: 'chat', icon: '💬', label: 'Chat' },
      { key: 'progress', icon: '📈', label: 'Progress' },
    ];
  };

  const renderTabNavigation = () => (
    <View style={styles.tabBar}>
      {getTabsForUser().map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
          onPress={() => setActiveTab(tab.key as TabType)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[
            styles.tabLabel, 
            activeTab === tab.key && styles.tabLabelActive
          ]}>
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
  );

  if (!currentUser) {
    return renderUserSelector();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      {renderHeader()}
      {renderTabContent()}
      {renderTabNavigation()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
  },
  chevron: {
    fontSize: 20,
    color: '#666',
  },
  header: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileRole: {
    fontSize: 12,
    color: '#999',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  tabDescription: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  macroSection: {
    flex: 1,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 14,
    color: '#999',
  },
  macroValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  workoutName: {
    fontSize: 16,
    color: '#fff',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  clientAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  clientEmail: {
    fontSize: 12,
    color: '#999',
  },
  clientStatus: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clientStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  toolButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  toolButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  toolButtonDesc: {
    color: '#999',
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
    padding: 4,
  },
  chatTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  chatTypeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  chatTypeText: {
    color: '#999',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatTypeTextActive: {
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageItem: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageContent: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageInputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    color: '#fff',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: '#333',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#999',
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabBadge: {
    position: 'absolute',
    top: 0,
    right: 8,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});