import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';

// UPDATE THIS WITH YOUR ACTUAL REPLIT URL
const API_BASE_URL = 'https://your-replit-deployment-url.replit.app';

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionTest, setConnectionTest] = useState('');

  // Test connection to Replit backend
  const testConnection = async () => {
    setLoading(true);
    setConnectionTest('Connecting to Replit server...');
    setError('');
    
    try {
      console.log('Testing connection to Replit server:', API_BASE_URL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/auth/available-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      setUsers(data);
      setConnectionTest(`SUCCESS: Connected to NexGen Fitness Replit server! Found ${data.length} users`);
      setError('');
      
    } catch (err) {
      console.error('Connection error:', err);
      let errorMessage = err.message;
      
      if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
        errorMessage = 'Connection timeout - check your Replit URL';
      } else if (errorMessage.includes('Network request failed')) {
        errorMessage = 'Network error - check WiFi connection';
      } else if (errorMessage.includes('fetch')) {
        errorMessage = 'Unable to reach server - verify Replit deployment is running';
      }
      
      setError(errorMessage);
      setConnectionTest(`FAILED: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-test connection when app loads
    testConnection();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>NexGen Fitness</Text>
        <Text style={styles.subtitle}>iPhone Mobile App</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Replit Server:</Text>
          <Text style={styles.url}>{API_BASE_URL}</Text>
          <Text style={styles.note}>
            Update API_BASE_URL in App.js with your actual Replit deployment URL
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status:</Text>
          <Text style={[
            styles.status, 
            loading ? styles.loading : (error ? styles.error : styles.success)
          ]}>
            {loading ? 'Testing connection...' : connectionTest}
          </Text>
        </View>

        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorTitle}>Troubleshooting:</Text>
            <Text style={styles.errorText}>
              1. Verify your Replit deployment is running
            </Text>
            <Text style={styles.errorText}>
              2. Update API_BASE_URL with correct Replit URL
            </Text>
            <Text style={styles.errorText}>
              3. Check iPhone WiFi connection
            </Text>
            <Text style={styles.errorText}>
              4. Test Replit URL in Safari first
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={testConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test Connection'}
          </Text>
        </TouchableOpacity>

        {users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ SUCCESS! Users Found ({users.length}):</Text>
            {users.map((user, index) => (
              <TouchableOpacity 
                key={user.id || index} 
                style={styles.userItem}
                onPress={() => Alert.alert(
                  'User Details', 
                  `${user.firstName} ${user.lastName}\n${user.email}\nRole: ${user.id.includes('coach') ? 'Trainer' : 'Client'}`
                )}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={[
                    styles.userRole, 
                    user.id.includes('coach') ? styles.trainer : styles.client
                  ]}>
                    {user.id.includes('coach') ? '👩‍🏫 Trainer' : '👤 Client'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>🎉 Mobile App Connected!</Text>
              <Text style={styles.successText}>
                Your iPhone successfully connected to the NexGen Fitness backend.
                You can now develop mobile features using this authentic user database.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Development Ready</Text>
          <Text style={styles.infoText}>
            ✓ iPhone + Expo Go + Replit Backend{'\n'}
            ✓ Real user data from fitness database{'\n'}
            ✓ Ready for mobile feature development
          </Text>
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
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: 'white',
    padding: 18,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  url: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  note: {
    fontSize: 11,
    color: '#ffc107',
    fontStyle: 'italic',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    color: '#17a2b8',
  },
  success: {
    color: '#28a745',
  },
  error: {
    color: '#dc3545',
  },
  errorSection: {
    backgroundColor: '#f8d7da',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    marginBottom: 3,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 12,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'column',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  trainer: {
    color: '#e83e8c',
  },
  client: {
    color: '#007bff',
  },
  successBanner: {
    backgroundColor: '#d4edda',
    padding: 20,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#155724',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#1976d2',
    lineHeight: 18,
  },
});