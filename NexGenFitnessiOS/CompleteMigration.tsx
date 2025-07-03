import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
} from 'react-native';

// Types matching your web app
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

interface CompleteMigrationProps {
  apiUrl: string;
  onBack: () => void;
}

const CompleteMigration: React.FC<CompleteMigrationProps> = ({ apiUrl, onBack }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeChatType, setActiveChatType] = useState<ChatType>('individual');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [macroTargets, setMacroTargets] = useState<MacroTarget | null>(null);
  const [dailyMacros, setDailyMacros] = useState<DailyMacros | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupChatMessages, setGroupChatMessages] = useState<ChatMessage[]>([]);
  const [individualChatMessages, setIndividualChatMessages] = useState<ChatMessage[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Load available users from API
  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/available-users`);
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      } else {
        // Fallback to hardcoded users if API not available
        setAvailableUsers([
          {
            id: 'angie_varrecchio_001',
            firstName: 'Angie',
            lastName: 'Varrecchio',
            email: 'angienola@yahoo.com',
            profileImageUrl: '/screenshots/angie-profile.jpg',
            timezone: 'America/New_York',
          },
          {
            id: '2xw8uz6udre',
            firstName: 'John',
            lastName: 'Savage',
            email: 'jgsavage98@gmail.com',
            profileImageUrl: '/screenshots/john-profile.jpg',
            timezone: 'America/New_York',
          },
          {
            id: 'coach_chassidy_001',
            firstName: 'Coach',
            lastName: 'Chassidy',
            email: 'coach@mindstrongfitness.com',
            profileImageUrl: '/screenshots/ce-bio-image.jpeg',
            timezone: 'America/New_York',
            isTrainer: true,
          },
          {
            id: 'chrissy_metz_001',
            firstName: 'Chrissy',
            lastName: 'Metz',
            email: 'chrissy@email.com',
            profileImageUrl: '/screenshots/chrissy-profile.jpg',
            timezone: 'America/New_York',
          },
          {
            id: 'jonah_hill_001',
            firstName: 'Jonah',
            lastName: 'Hill',
            email: 'jonah@email.com',
            profileImageUrl: '/screenshots/jonah-profile.jpg',
            timezone: 'America/New_York',
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setShowUserSelector(false);
    loadUserData(user);
  };

  const loadUserData = async (user: User) => {
    setLoading(true);
    try {
      // Create auth headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`,
      };

      // Load macro targets
      const macroResponse = await fetch(`${apiUrl}/api/macro-targets`, { headers });
      if (macroResponse.ok) {
        const macroData = await macroResponse.json();
        setMacroTargets(macroData);
      }

      // Load daily macros
      const dailyResponse = await fetch(`${apiUrl}/api/daily-macros`, { headers });
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json();
        setDailyMacros(dailyData);
      }

      // Load workout
      const workoutResponse = await fetch(`${apiUrl}/api/workout/today`, { headers });
      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json();
        setWorkout(workoutData);
      }

      // Load unread count
      const unreadResponse = await fetch(`${apiUrl}/api/chat/unread-count`, { headers });
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

  const loadChatMessages = async (user: User, headers: any) => {
    try {
      // Load individual chat messages - using the correct API endpoint
      const individualResponse = await fetch(`${apiUrl}/api/chat/messages?chatType=individual`, { headers });
      if (individualResponse.ok) {
        const individualData = await individualResponse.json();
        setIndividualChatMessages(individualData || []);
      }

      // Load group chat messages - using the correct API endpoint  
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

      // Use the correct endpoint for sending messages
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
        // Reload chat messages
        await loadChatMessages(currentUser, headers);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRefresh = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    await loadUserData(currentUser);
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            setCurrentUser(null);
            setShowUserSelector(true);
            setActiveTab('dashboard');
          }
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const formatJourneyDay = (startDate?: string) => {
    if (!startDate) return "Ready to begin your journey";
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Day ${diffDays} of your journey`;
  };

  const renderUserSelector = () => (
    <Modal visible={showUserSelector} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select User</Text>
        </View>
        <ScrollView style={styles.userList}>
          {availableUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userItem}
              onPress={() => handleUserSelect(user)}
            >
              <Image 
                source={{ uri: `${apiUrl}${user.profileImageUrl}` }}
                style={styles.userAvatar}
                defaultSource={{ uri: 'https://via.placeholder.com/50/666/fff?text=' + user.firstName.charAt(0) }}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.isTrainer && <Text style={styles.trainerBadge}>Trainer</Text>}
              </View>
              <Text style={styles.chevronIcon}>→</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => setShowUserSelector(true)}>
          <Image 
            source={{ uri: `${apiUrl}${currentUser?.profileImageUrl}` }}
            style={styles.profileImage}
            defaultSource={{ uri: 'https://via.placeholder.com/40/666/fff?text=' + (currentUser?.firstName.charAt(0) || 'U') }}
          />
        </TouchableOpacity>
        <View style={styles.userDetails}>
          <Text style={styles.welcomeText}>
            {currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Welcome!'}
          </Text>
          <Text style={styles.journeyText}>
            {formatJourneyDay(currentUser?.programStartDate)}
          </Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutIcon}>⏻</Text>
        </TouchableOpacity>
        <Text style={styles.logoText}>IGNITE</Text>
      </View>
    </View>
  );

  const renderMacroCard = () => {
    const hasUploadedToday = dailyMacros && dailyMacros.recordedAt.startsWith(getTodayString());
    const consumedMacros = hasUploadedToday ? {
      calories: dailyMacros.extractedCalories || 0,
      protein: dailyMacros.extractedProtein || 0,
      carbs: dailyMacros.extractedCarbs || 0,
      fat: dailyMacros.extractedFat || 0,
    } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Nutrition</Text>
          <TouchableOpacity 
            style={[styles.uploadButton, hasUploadedToday && styles.uploadButtonComplete]}
            onPress={() => setActiveTab('nutrition')}
          >
            <Text style={styles.uploadButtonText}>
              {hasUploadedToday ? 'Upload Complete' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {macroTargets && (
          <View style={styles.macroContent}>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Calories</Text>
                <Text style={styles.macroValue}>{consumedMacros.calories} / {macroTargets.calories}</Text>
                <View style={styles.macroBar}>
                  <View 
                    style={[
                      styles.macroProgress,
                      { width: `${Math.min((consumedMacros.calories / macroTargets.calories) * 100, 100)}%` }
                    ]}
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{consumedMacros.protein}g / {macroTargets.protein}g</Text>
                <View style={styles.macroBar}>
                  <View 
                    style={[
                      styles.macroProgress,
                      { 
                        width: `${Math.min((consumedMacros.protein / macroTargets.protein) * 100, 100)}%`,
                        backgroundColor: '#4ade80'
                      }
                    ]}
                  />
                </View>
              </View>
              
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{consumedMacros.carbs}g / {macroTargets.carbs}g</Text>
                <View style={styles.macroBar}>
                  <View 
                    style={[
                      styles.macroProgress,
                      { 
                        width: `${Math.min((consumedMacros.carbs / macroTargets.carbs) * 100, 100)}%`,
                        backgroundColor: '#3b82f6'
                      }
                    ]}
                  />
                </View>
              </View>
              
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>{consumedMacros.fat}g / {macroTargets.fat}g</Text>
                <View style={styles.macroBar}>
                  <View 
                    style={[
                      styles.macroProgress,
                      { 
                        width: `${Math.min((consumedMacros.fat / macroTargets.fat) * 100, 100)}%`,
                        backgroundColor: '#f59e0b'
                      }
                    ]}
                  />
                </View>
              </View>
            </View>

            {hasUploadedToday && dailyMacros && (
              <View style={styles.wellnessRow}>
                <View style={styles.wellnessItem}>
                  <Text style={styles.wellnessLabel}>Hunger Level</Text>
                  <Text style={styles.wellnessValue}>{dailyMacros.hungerLevel}/5</Text>
                </View>
                <View style={styles.wellnessItem}>
                  <Text style={styles.wellnessLabel}>Energy Level</Text>
                  <Text style={styles.wellnessValue}>{dailyMacros.energyLevel}/5</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderChatMessages = () => {
    const messages = activeChatType === 'group' ? groupChatMessages : individualChatMessages;
    
    return (
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <View style={styles.chatTabs}>
            <TouchableOpacity
              style={[styles.chatTab, activeChatType === 'individual' && styles.chatTabActive]}
              onPress={() => setActiveChatType('individual')}
            >
              <Text style={[styles.chatTabText, activeChatType === 'individual' && styles.chatTabTextActive]}>
                Coach Chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatTab, activeChatType === 'group' && styles.chatTabActive]}
              onPress={() => setActiveChatType('group')}
            >
              <Text style={[styles.chatTabText, activeChatType === 'group' && styles.chatTabTextActive]}>
                Group Chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.messagesContainer}>
          {messages.map((message, index) => (
            <View key={index} style={[
              styles.messageItem,
              message.isFromCoach ? styles.messageFromCoach : styles.messageFromUser
            ]}>
              {message.isFromCoach && (
                <Image 
                  source={{ uri: `${apiUrl}/screenshots/ce-bio-image.jpeg` }}
                  style={styles.messageAvatar}
                  defaultSource={{ uri: 'https://via.placeholder.com/30/666/fff?text=C' }}
                />
              )}
              <View style={styles.messageContent}>
                <Text style={styles.messageSender}>{message.senderName}</Text>
                <Text style={styles.messageText}>{message.content}</Text>
                <Text style={styles.messageTime}>{formatTimestamp(message.timestamp)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        
        <View style={styles.messageInput}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {renderMacroCard()}
      
      <TouchableOpacity 
        style={styles.card}
        onPress={() => setActiveTab('workout')}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Workout</Text>
          <Text style={styles.iconText}>💪</Text>
        </View>
        <Text style={styles.workoutName}>
          {workout?.name || 'No workout assigned'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.card}
        onPress={() => setActiveTab('progress')}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Progress</Text>
          <Text style={styles.iconText}>📈</Text>
        </View>
        <Text style={styles.cardDescription}>View your progress and measurements</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card}
        onPress={() => setActiveTab('chat')}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Coach Chat</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDescription}>Chat with Coach Chassidy and group</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

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
    fontWeight: '600',
    color: '#fff',
  },
  userList: {
    flex: 1,
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  trainerBadge: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  chevronIcon: {
    fontSize: 20,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  journeyText: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    marginRight: 12,
  },
  logoutIcon: {
    fontSize: 18,
    color: '#666',
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  uploadButtonComplete: {
    backgroundColor: '#4ade80',
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  iconText: {
    fontSize: 20,
  },
  macroContent: {
    marginTop: 8,
  },
  macroRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  macroItem: {
    flex: 1,
    marginRight: 12,
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  macroBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  macroProgress: {
    height: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  wellnessRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  wellnessItem: {
    flex: 1,
    alignItems: 'center',
  },
  wellnessLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  wellnessValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Chat styles
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    backgroundColor: '#2a2a2a',
    padding: 16,
  },
  chatTabs: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
  },
  chatTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  chatTabActive: {
    backgroundColor: '#3b82f6',
  },
  chatTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  chatTabTextActive: {
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageFromCoach: {
    justifyContent: 'flex-start',
  },
  messageFromUser: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
  },
  messageSender: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  messageInput: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  tabDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabItemActive: {
    // Active tab styling
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
  },
  tabLabelActive: {
    color: '#3b82f6',
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: '25%',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CompleteMigration;