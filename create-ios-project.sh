#!/bin/bash

# Navigate to project directory
cd ~/Documents/Personal/NexGen-Fitness

# Remove incomplete iOS project
rm -rf NexGenFitnessiOS

# Create new React Native project
npx react-native@latest init NexGenFitnessiOS

# Navigate to the new project
cd NexGenFitnessiOS

# Replace the default App.tsx with our custom one
cat > App.tsx << 'EOF'
import React, {useState} from 'react';
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
} from 'react-native';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

function App(): React.JSX.Element {
  const [apiUrl, setApiUrl] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Enter your Replit URL to begin');

  const testConnection = async () => {
    if (!apiUrl || !apiUrl.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with https://');
      return;
    }

    setLoading(true);
    setConnectionStatus('Testing connection...');
    setError('');

    try {
      console.log('Testing connection to:', apiUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${apiUrl}/api/auth/available-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Success! Users:', data);

      setUsers(data);
      setConnectionStatus(`✅ SUCCESS! Connected to NexGen Fitness - Found ${data.length} users`);
      setError('');
    } catch (err: any) {
      console.error('Connection error:', err);
      let errorMessage = err.message;

      if (errorMessage.includes('AbortError')) {
        errorMessage = 'Connection timeout - server may be slow or down';
      } else if (errorMessage.includes('Network request failed')) {
        errorMessage = 'Network error - check your internet connection';
      } else if (errorMessage.includes('TypeError')) {
        errorMessage = 'Invalid URL format - make sure it starts with https://';
      }

      setError(errorMessage);
      setConnectionStatus(`❌ FAILED: ${errorMessage}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const isTrainer = (userId: string) => userId.includes('coach');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>NexGen Fitness</Text>
          <Text style={styles.subtitle}>Native iOS App</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 iPhone 15 + Replit Connection</Text>
            <Text style={styles.description}>
              Native iOS app connecting directly to your Replit backend server.
            </Text>
          </View>

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
            <Text style={styles.hint}>
              Get this from your Replit deployment page
            </Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={testConnection}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'Testing...' : 'Test Native iOS Connection'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connection Status:</Text>
            <Text
              style={[
                styles.status,
                connectionStatus.includes('SUCCESS')
                  ? styles.statusSuccess
                  : connectionStatus.includes('FAILED')
                  ? styles.statusError
                  : styles.statusNeutral,
              ]}>
              {connectionStatus}
            </Text>
          </View>

          {error && (
            <View style={styles.errorSection}>
              <Text style={styles.errorTitle}>Common Issues:</Text>
              <Text style={styles.errorText}>• Make sure your Replit deployment is running</Text>
              <Text style={styles.errorText}>• Check the URL is correct (starts with https://)</Text>
              <Text style={styles.errorText}>• Test the URL in Safari browser first</Text>
              <Text style={styles.errorText}>• Ensure your iPhone has internet connection</Text>
            </View>
          )}

          {users.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎉 Success! Found {users.length} Users:</Text>
              {users.map((user, index) => (
                <TouchableOpacity
                  key={user.id || index}
                  style={styles.userItem}
                  onPress={() =>
                    Alert.alert(
                      'User Details',
                      `${user.firstName} ${user.lastName}\n${user.email}\nRole: ${
                        isTrainer(user.id) ? 'Trainer' : 'Client'
                      }`,
                    )
                  }>
                  <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={[styles.userRole, isTrainer(user.id) ? styles.trainer : styles.client]}>
                    {isTrainer(user.id) ? '👩‍🏫 Trainer' : '👤 Client'}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.successBanner}>
                <Text style={styles.successTitle}>Native iOS Development Ready!</Text>
                <Text style={styles.successText}>
                  Your iPhone 15 is now connected to the NexGen Fitness backend via native iOS app.
                  You can now develop full mobile features using authentic user data.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Native iOS Setup Complete</Text>
            <Text style={styles.infoText}>
              iPhone 15 + React Native + Replit Backend{'\n'}
              Real fitness user database{'\n'}
              Native iOS mobile app development ready
            </Text>
          </View>
        </View>
      </ScrollView>
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
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
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    padding: 15,
    borderRadius: 8,
    textAlign: 'center',
  },
  statusSuccess: {
    color: '#155724',
    backgroundColor: '#d4edda',
  },
  statusError: {
    color: '#721c24',
    backgroundColor: '#f8d7da',
  },
  statusNeutral: {
    color: '#495057',
    backgroundColor: '#e9ecef',
  },
  errorSection: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
  userItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 15,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 3,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 5,
  },
  trainer: {
    color: '#e83e8c',
  },
  client: {
    color: '#007bff',
  },
  successBanner: {
    backgroundColor: '#d4edda',
    padding: 25,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#155724',
    textAlign: 'center',
    lineHeight: 24,
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 10,
    marginTop: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});

export default App;
EOF

# Install iOS dependencies
cd ios
pod install
cd ..

echo "✅ Complete React Native iOS project created!"
echo "📱 Ready to run: npx react-native run-ios --simulator=\"iPhone 15\""