import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
}

interface MacroEntry {
  id: string;
  extractedCalories: number;
  extractedProtein: number;
  extractedCarbs: number;
  extractedFat: number;
  hungerLevel: number;
  energyLevel: number;
  recordedAt: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  recordedAt: string;
}

interface ChatMessage {
  id: string;
  content: string;
  senderName: string;
  isFromCoach: boolean;
  timestamp: string;
}

type Screen = 'login' | 'dashboard' | 'macros' | 'progress' | 'chat' | 'settings';

function App(): React.JSX.Element {
  const [apiUrl, setApiUrl] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [macroEntries, setMacroEntries] = useState<MacroEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const testConnection = async () => {
    if (!apiUrl || !apiUrl.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with https://');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/available-users`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setUsers(data);
      setShowUserModal(true);
    } catch (err: any) {
      Alert.alert('Connection Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginAsUser = async (user: User) => {
    setCurrentUser(user);
    setShowUserModal(false);
    setCurrentScreen('dashboard');
    loadUserData(user);
  };

  const loadUserData = async (user: User) => {
    console.log('Loading data for user:', user.firstName);
    
    // Generate sample data specific to each user for demonstration
    const sampleMacroEntries: MacroEntry[] = [
      {
        id: '1',
        extractedCalories: user.id.includes('angie') ? 1650 : user.id.includes('john') ? 2137 : 1800,
        extractedProtein: user.id.includes('angie') ? 140 : user.id.includes('john') ? 198 : 160,
        extractedCarbs: user.id.includes('angie') ? 150 : user.id.includes('john') ? 154 : 170,
        extractedFat: user.id.includes('angie') ? 65 : user.id.includes('john') ? 81 : 70,
        hungerLevel: 3,
        energyLevel: 4,
        recordedAt: new Date().toISOString(),
      },
      {
        id: '2',
        extractedCalories: user.id.includes('angie') ? 1580 : user.id.includes('john') ? 2089 : 1750,
        extractedProtein: user.id.includes('angie') ? 138 : user.id.includes('john') ? 186 : 155,
        extractedCarbs: user.id.includes('angie') ? 145 : user.id.includes('john') ? 143 : 165,
        extractedFat: user.id.includes('angie') ? 62 : user.id.includes('john') ? 107 : 68,
        hungerLevel: 4,
        energyLevel: 3,
        recordedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      },
    ];

    const sampleWeightEntries: WeightEntry[] = [
      {
        id: '1',
        weight: user.id.includes('angie') ? 200 : user.id.includes('john') ? 180.8 : user.id.includes('chrissy') ? 220 : 195,
        recordedAt: new Date().toISOString(),
      },
      {
        id: '2',
        weight: user.id.includes('angie') ? 199.5 : user.id.includes('john') ? 180.4 : user.id.includes('chrissy') ? 219.5 : 194.5,
        recordedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      },
    ];

    const sampleChatMessages: ChatMessage[] = [
      {
        id: '1',
        content: `Hey ${user.firstName}! Great job on your macro tracking today. You're really staying consistent with your nutrition goals!`,
        senderName: 'Coach Chassidy',
        isFromCoach: true,
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
      {
        id: '2',
        content: 'Thank you! I\'m feeling really motivated and the tracking is becoming a habit.',
        senderName: user.firstName,
        isFromCoach: false,
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      },
      {
        id: '3',
        content: 'That\'s exactly what we want to hear! Consistency is key. Keep up the amazing work! 💪',
        senderName: 'Coach Chassidy',
        isFromCoach: true,
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
      },
    ];

    // Simulate loading delay
    setTimeout(() => {
      setMacroEntries(sampleMacroEntries);
      setWeightEntries(sampleWeightEntries);
      setChatMessages(sampleChatMessages);
      console.log('Sample data loaded successfully for', user.firstName);
    }, 1000);
  };

  const refreshUserData = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    await loadUserData(currentUser);
    setRefreshing(false);
  };

  const renderLoginScreen = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        <Text style={styles.title}>NexGen Fitness</Text>
        <Text style={styles.subtitle}>Native iOS App</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Your Replit URL</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://your-app-name.replit.app"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testConnection}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Connecting...' : 'Connect to NexGen Fitness'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDashboard = () => (
    <ScrollView 
      style={styles.scrollView}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshUserData} />}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome, {currentUser?.firstName}!</Text>
        
        <View style={styles.dashboardGrid}>
          <TouchableOpacity 
            style={[styles.dashboardCard, {backgroundColor: '#007bff'}]}
            onPress={() => setCurrentScreen('macros')}>
            <Text style={styles.dashboardCardTitle}>📊 Macros</Text>
            <Text style={styles.dashboardCardText}>
              {macroEntries.length} entries logged
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dashboardCard, {backgroundColor: '#28a745'}]}
            onPress={() => setCurrentScreen('progress')}>
            <Text style={styles.dashboardCardTitle}>📈 Progress</Text>
            <Text style={styles.dashboardCardText}>
              {weightEntries.length} weight entries
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dashboardCard, {backgroundColor: '#ffc107'}]}
            onPress={() => setCurrentScreen('chat')}>
            <Text style={styles.dashboardCardTitle}>💬 Chat</Text>
            <Text style={styles.dashboardCardText}>
              {chatMessages.length} messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dashboardCard, {backgroundColor: '#6c757d'}]}
            onPress={() => setCurrentScreen('settings')}>
            <Text style={styles.dashboardCardTitle}>⚙️ Settings</Text>
            <Text style={styles.dashboardCardText}>
              Account settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderMacros = () => (
    <ScrollView 
      style={styles.scrollView}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshUserData} />}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Macro Entries</Text>
        
        {macroEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No macro entries found</Text>
          </View>
        ) : (
          macroEntries.map((entry, index) => (
            <View key={entry.id || index} style={styles.macroCard}>
              <Text style={styles.macroDate}>
                {new Date(entry.recordedAt).toLocaleDateString()}
              </Text>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Calories:</Text>
                <Text style={styles.macroValue}>{entry.extractedCalories}</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Protein:</Text>
                <Text style={styles.macroValue}>{entry.extractedProtein}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Carbs:</Text>
                <Text style={styles.macroValue}>{entry.extractedCarbs}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Fat:</Text>
                <Text style={styles.macroValue}>{entry.extractedFat}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Hunger:</Text>
                <Text style={styles.macroValue}>{entry.hungerLevel}/5</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Energy:</Text>
                <Text style={styles.macroValue}>{entry.energyLevel}/5</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderProgress = () => (
    <ScrollView 
      style={styles.scrollView}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshUserData} />}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Weight Progress</Text>
        
        {weightEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No weight entries found</Text>
          </View>
        ) : (
          weightEntries.map((entry, index) => (
            <View key={entry.id || index} style={styles.progressCard}>
              <Text style={styles.progressDate}>
                {new Date(entry.recordedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.progressWeight}>{entry.weight} lbs</Text>
              {index > 0 && (
                <Text style={[
                  styles.progressChange,
                  entry.weight < weightEntries[index - 1].weight 
                    ? styles.progressDown 
                    : styles.progressUp
                ]}>
                  {entry.weight < weightEntries[index - 1].weight ? '↓' : '↑'} 
                  {Math.abs(entry.weight - weightEntries[index - 1].weight).toFixed(1)} lbs
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderChat = () => (
    <ScrollView 
      style={styles.scrollView}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshUserData} />}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Chat with Coach</Text>
        
        {chatMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No messages yet</Text>
          </View>
        ) : (
          chatMessages.map((message, index) => (
            <View key={message.id || index} style={[
              styles.chatMessage,
              message.isFromCoach ? styles.coachMessage : styles.userMessage
            ]}>
              <Text style={styles.chatSender}>{message.senderName}</Text>
              <Text style={styles.chatContent}>{message.content}</Text>
              <Text style={styles.chatTime}>
                {new Date(message.timestamp).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Account</Text>
          <Text style={styles.settingsText}>Name: {currentUser?.firstName} {currentUser?.lastName}</Text>
          <Text style={styles.settingsText}>Email: {currentUser?.email}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, {backgroundColor: '#dc3545'}]}
          onPress={() => {
            setCurrentUser(null);
            setCurrentScreen('login');
          }}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderNavigation = () => (
    <View style={styles.navigation}>
      <TouchableOpacity 
        style={[styles.navItem, currentScreen === 'dashboard' && styles.navItemActive]}
        onPress={() => setCurrentScreen('dashboard')}>
        <Text style={styles.navText}>🏠 Home</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.navItem, currentScreen === 'macros' && styles.navItemActive]}
        onPress={() => setCurrentScreen('macros')}>
        <Text style={styles.navText}>📊 Macros</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.navItem, currentScreen === 'progress' && styles.navItemActive]}
        onPress={() => setCurrentScreen('progress')}>
        <Text style={styles.navText}>📈 Progress</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.navItem, currentScreen === 'chat' && styles.navItemActive]}
        onPress={() => setCurrentScreen('chat')}>
        <Text style={styles.navText}>💬 Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.navItem, currentScreen === 'settings' && styles.navItemActive]}
        onPress={() => setCurrentScreen('settings')}>
        <Text style={styles.navText}>⚙️ Settings</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {currentScreen === 'login' && renderLoginScreen()}
      {currentScreen === 'dashboard' && renderDashboard()}
      {currentScreen === 'macros' && renderMacros()}
      {currentScreen === 'progress' && renderProgress()}
      {currentScreen === 'chat' && renderChat()}
      {currentScreen === 'settings' && renderSettings()}

      {currentUser && renderNavigation()}

      {/* User Selection Modal */}
      <Modal visible={showUserModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select User</Text>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={styles.userItem}
                  onPress={() => loginAsUser(item)}>
                  <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <Text style={styles.userRole}>
                    {item.id.includes('coach') ? '👩‍🏫 Trainer' : '👤 Client'}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              style={[styles.button, {backgroundColor: '#6c757d'}]}
              onPress={() => setShowUserModal(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  dashboardCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  dashboardCardText: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  macroCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  macroDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  macroLabel: {
    fontSize: 14,
    color: '#666',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  progressCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  progressWeight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  progressChange: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  progressDown: {
    color: '#28a745',
  },
  progressUp: {
    color: '#dc3545',
  },
  chatMessage: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  coachMessage: {
    backgroundColor: '#e3f2fd',
    marginLeft: 0,
    marginRight: 40,
  },
  userMessage: {
    backgroundColor: '#f8f9fa',
    marginLeft: 40,
    marginRight: 0,
  },
  chatSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  chatContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  settingsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  settingsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  navItemActive: {
    backgroundColor: '#007bff',
  },
  navText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  userItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 5,
  },
});

export default App;