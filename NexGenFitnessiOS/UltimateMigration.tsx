import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  RefreshControl,
  Alert,
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
  content: string;
  senderName: string;
  isFromCoach: boolean;
  timestamp: string;
  userId?: string;
  metadata?: any;
}

interface Workout {
  id: string;
  name: string;
  exercises: any[];
}

type TabType = 'dashboard' | 'nutrition' | 'workout' | 'chat' | 'progress';
type ChatType = 'individual' | 'group';

interface UltimateMigrationProps {
  apiUrl: string;
  onBack: () => void;
}

export default function UltimateMigration({ apiUrl, onBack }: UltimateMigrationProps) {
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
  const [individualChatMessages, setIndividualChatMessages] = useState<ChatMessage[]>([]);
  const [groupChatMessages, setGroupChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Trainer dashboard state (for Chassidy)
  const [showTrainerDashboard, setShowTrainerDashboard] = useState(false);
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
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setShowUserSelector(false);
    
    // If Coach Chassidy is selected, show trainer dashboard
    if (user.id === 'coach_chassidy') {
      setShowTrainerDashboard(true);
      loadTrainerData(user);
    } else {
      setShowTrainerDashboard(false);
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

      // Load all user data in parallel
      const [macroResponse, dailyResponse, workoutResponse, unreadResponse] = await Promise.all([
        fetch(`${apiUrl}/api/macro-targets`, { headers }),
        fetch(`${apiUrl}/api/daily-macros`, { headers }),
        fetch(`${apiUrl}/api/workout/today`, { headers }),
        fetch(`${apiUrl}/api/chat/unread-count`, { headers }),
      ]);

      if (macroResponse.ok) {
        const macroData = await macroResponse.json();
        setMacroTargets(macroData);
      }

      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json();
        setDailyMacros(dailyData);
      }

      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json();
        setWorkout(workoutData);
      }

      if (unreadResponse.ok) {
        const unreadData = await unreadResponse.json();
        setUnreadCount(unreadData.count || 0);
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

      // Load trainer-specific data
      const clientsResponse = await fetch(`${apiUrl}/api/auth/available-users`, { headers });
      if (clientsResponse.ok) {
        const allUsers = await clientsResponse.json();
        const clientUsers = allUsers.filter((u: User) => !u.isTrainer);
        setClients(clientUsers);
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
      // Load individual chat messages
      const individualResponse = await fetch(`${apiUrl}/api/chat/messages?chatType=individual`, { headers });
      if (individualResponse.ok) {
        const individualData = await individualResponse.json();
        setIndividualChatMessages(individualData || []);
      }

      // Load group chat messages
      const groupResponse = await fetch(`${apiUrl}/api/chat/messages?chatType=group`, { headers });
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroupChatMessages(groupData || []);
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

      const response = await fetch(`${apiUrl}/api/chat/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: newMessage,
          chatType: activeChatType,
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await loadChatMessages(currentUser, headers);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onRefresh = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    if (showTrainerDashboard) {
      await loadTrainerData(currentUser);
    } else {
      await loadUserData(currentUser);
    }
    setRefreshing(false);
  };

  const getProfileImageUrl = (user: User) => {
    if (!user.profileImageUrl) return null;
    
    // Handle different URL formats from database
    let imageUrl = user.profileImageUrl;
    
    // Remove leading slash if present
    if (imageUrl.startsWith('/')) {
      imageUrl = imageUrl.slice(1);
    }
    
    return `${apiUrl}/${imageUrl}`;
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
              {user.profileImageUrl ? (
                <Image
                  source={{ uri: getProfileImageUrl(user) }}
                  style={styles.userAvatar}
                  onError={() => console.log('Error loading profile image for', user.firstName)}
                />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarText}>
                    {user.firstName[0]}{user.lastName[0]}
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
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>
              {currentUser?.firstName[0]}{currentUser?.lastName[0]}
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
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={styles.tabTitle}>👨‍💼 Trainer Dashboard</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Clients ({clients.length})</Text>
        {clients.map((client) => (
          <View key={client.id} style={styles.clientItem}>
            {client.profileImageUrl ? (
              <Image
                source={{ uri: getProfileImageUrl(client) }}
                style={styles.clientAvatar}
              />
            ) : (
              <View style={styles.clientAvatarPlaceholder}>
                <Text style={styles.clientAvatarText}>
                  {client.firstName[0]}{client.lastName[0]}
                </Text>
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.firstName} {client.lastName}</Text>
              <Text style={styles.clientEmail}>{client.email}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Coach Tools</Text>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>📊 Weekly Check-ins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>⚙️ AI Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>📈 Client Progress</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDashboard = () => {
    if (showTrainerDashboard) {
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
          {macroTargets && (
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
    const messages = activeChatType === 'individual' ? individualChatMessages : groupChatMessages;
    
    return (
      <View style={styles.chatContainer}>
        {/* Chat Type Selector */}
        <View style={styles.chatTypeSelector}>
          <TouchableOpacity
            style={[
              styles.chatTypeButton,
              activeChatType === 'individual' && styles.chatTypeButtonActive
            ]}
            onPress={() => setActiveChatType('individual')}
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
            onPress={() => setActiveChatType('group')}
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
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <View key={`${message.id}-${index}`} style={styles.messageItem}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{message.senderName}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.messageContent}>{message.content}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyMessagesContainer}>
              <Text style={styles.emptyMessagesText}>
                No messages in {activeChatType} chat yet
              </Text>
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

  const renderTabNavigation = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { key: 'nutrition', icon: '📸', label: 'Nutrition' },
        { key: 'workout', icon: '💪', label: 'Workout' },
        { key: 'chat', icon: '💬', label: 'Chat' },
        { key: 'progress', icon: '📈', label: 'Progress' },
      ].map((tab) => (
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
  modalContainer: {
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
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
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