import React, { useState } from 'react';
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
}

interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyMacros {
  extractedCalories: number;
  extractedProtein: number;
  extractedCarbs: number;
  extractedFat: number;
  hungerLevel: number;
  energyLevel: number;
  date: string;
}

interface Workout {
  id: string;
  name: string;
  exercises: any[];
}

type TabType = 'dashboard' | 'nutrition' | 'workout' | 'chat' | 'progress';

interface FixedWebAppMigrationProps {
  apiUrl: string;
  onBack: () => void;
}

const FixedWebAppMigration: React.FC<FixedWebAppMigrationProps> = ({ apiUrl, onBack }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(true);
  
  // Data states
  const [macroTargets, setMacroTargets] = useState<MacroTarget | null>(null);
  const [dailyMacros, setDailyMacros] = useState<DailyMacros | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Available users (matching your web app)
  const availableUsers: User[] = [
    {
      id: 'angie_varrecchio_001',
      firstName: 'Angie',
      lastName: 'Varrecchio',
      email: 'angienola@yahoo.com',
      profileImageUrl: 'https://via.placeholder.com/50/4ade80/ffffff?text=A',
      timezone: 'America/New_York',
    },
    {
      id: '2xw8uz6udre',
      firstName: 'John',
      lastName: 'Savage',
      email: 'jgsavage98@gmail.com',
      profileImageUrl: 'https://via.placeholder.com/50/3b82f6/ffffff?text=J',
      timezone: 'America/New_York',
    },
    {
      id: 'coach_chassidy_001',
      firstName: 'Coach',
      lastName: 'Chassidy',
      email: 'coach@mindstrongfitness.com',
      profileImageUrl: 'https://via.placeholder.com/50/f59e0b/ffffff?text=C',
      timezone: 'America/New_York',
    },
    {
      id: 'chrissy_metz_001',
      firstName: 'Chrissy',
      lastName: 'Metz',
      email: 'chrissy@email.com',
      profileImageUrl: 'https://via.placeholder.com/50/ef4444/ffffff?text=CM',
      timezone: 'America/New_York',
    },
    {
      id: 'jonah_hill_001',
      firstName: 'Jonah',
      lastName: 'Hill',
      email: 'jonah@email.com',
      profileImageUrl: 'https://via.placeholder.com/50/8b5cf6/ffffff?text=JH',
      timezone: 'America/New_York',
    },
  ];

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

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setShowUserSelector(false);
    loadUserData(user);
  };

  const loadUserData = async (user: User) => {
    // Set default/sample data based on user
    setMacroTargets({
      calories: user.id.includes('angie') ? 1650 : user.id.includes('john') ? 2137 : 1800,
      protein: user.id.includes('angie') ? 140 : user.id.includes('john') ? 198 : 160,
      carbs: user.id.includes('angie') ? 150 : user.id.includes('john') ? 154 : 170,
      fat: user.id.includes('angie') ? 65 : user.id.includes('john') ? 81 : 70,
    });

    // Sample daily macros for demonstration
    if (user.id.includes('john')) {
      setDailyMacros({
        extractedCalories: 1890,
        extractedProtein: 185,
        extractedCarbs: 145,
        extractedFat: 75,
        hungerLevel: 3,
        energyLevel: 4,
        date: getTodayString(),
      });
    }

    setWorkout({
      id: '1',
      name: 'Upper Body Strength',
      exercises: ['Push-ups', 'Pull-ups', 'Bench Press'],
    });

    setUnreadCount(user.id.includes('coach') ? 0 : 5);
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
                source={{ uri: user.profileImageUrl }}
                style={styles.userAvatar}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
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
            source={{ uri: currentUser?.profileImageUrl }}
            style={styles.profileImage}
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
    const hasUploadedToday = dailyMacros && dailyMacros.date === getTodayString();
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

  const renderWorkoutCard = () => (
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
      {workout && (
        <Text style={styles.workoutDetails}>
          {workout.exercises?.length || 0} exercises
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {renderMacroCard()}
      {renderWorkoutCard()}
      
      <TouchableOpacity 
        style={styles.card}
        onPress={() => setActiveTab('progress')}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Progress</Text>
          <Text style={styles.iconText}>📈</Text>
        </View>
        <Text style={styles.cardDescription}>View your weight and measurement progress</Text>
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
        <Text style={styles.cardDescription}>Chat with Coach Chassidy</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'nutrition':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>📸 Nutrition Upload</Text>
            <Text style={styles.tabDescription}>Take a photo of your meal to track macros</Text>
            <TouchableOpacity 
              style={styles.featureButton}
              onPress={() => setActiveTab('dashboard')}
            >
              <Text style={styles.featureButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );
      case 'workout':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>💪 Today's Workout</Text>
            <Text style={styles.tabDescription}>{workout?.name || 'No workout assigned'}</Text>
            {workout && workout.exercises.map((exercise, index) => (
              <Text key={index} style={styles.exerciseItem}>• {exercise}</Text>
            ))}
            <TouchableOpacity 
              style={styles.featureButton}
              onPress={() => setActiveTab('dashboard')}
            >
              <Text style={styles.featureButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );
      case 'chat':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>💬 Coach Chat</Text>
            <Text style={styles.tabDescription}>Messages with Coach Chassidy</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount} unread messages</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.featureButton}
              onPress={() => setActiveTab('dashboard')}
            >
              <Text style={styles.featureButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );
      case 'progress':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>📈 Progress Tracking</Text>
            <Text style={styles.tabDescription}>Your weight and measurement history</Text>
            <TouchableOpacity 
              style={styles.featureButton}
              onPress={() => setActiveTab('dashboard')}
            >
              <Text style={styles.featureButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
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
  workoutDetails: {
    fontSize: 14,
    color: '#666',
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
  exerciseItem: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  featureButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  featureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  unreadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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

export default FixedWebAppMigration;