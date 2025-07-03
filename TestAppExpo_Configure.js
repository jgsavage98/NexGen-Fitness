import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';

export default function App() {
  const [apiUrl, setApiUrl] = useState('https://your-replit-url.replit.app');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Ready to test');

  // Test connection to any server URL
  const testConnection = async (urlToTest = apiUrl) => {
    if (!urlToTest || urlToTest.includes('your-replit-url')) {
      Alert.alert('Configuration Required', 'Please enter your actual Replit deployment URL first');
      return;
    }

    setLoading(true);
    setConnectionStatus('Testing connection...');
    setError('');
    
    try {
      console.log('Testing connection to:', urlToTest);
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${urlToTest}/api/auth/available-users`, {
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
      setConnectionStatus(`✅ SUCCESS! Connected to server - Found ${data.length} users`);
      setError('');
      
    } catch (err) {
      console.error('Connection error:', err);
      let errorMessage = err.message;
      
      if (errorMessage.includes('AbortError')) {
        errorMessage = 'Connection timeout - server may be down';
      } else if (errorMessage.includes('Network request failed')) {
        errorMessage = 'Network error - check your internet connection';
      } else if (errorMessage.includes('TypeError')) {
        errorMessage = 'Invalid URL format';
      }
      
      setError(errorMessage);
      setConnectionStatus(`❌ FAILED: ${errorMessage}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>NexGen Fitness</Text>
        <Text style={styles.subtitle}>iPhone Setup & Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Enter Your Replit URL</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://your-app-name.replit.app"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Get this from your Replit deployment page
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 2: Test Connection</Text>
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={() => testConnection()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status:</Text>
          <Text style={[
            styles.status, 
            connectionStatus.includes('SUCCESS') ? styles.success : 
            connectionStatus.includes('FAILED') ? styles.error : styles.neutral
          ]}>
            {connectionStatus}
          </Text>
        </View>

        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorTitle}>Troubleshooting Tips:</Text>
            <Text style={styles.errorText}>• Make sure your Replit app is deployed and running</Text>
            <Text style={styles.errorText}>• Check the URL format (should start with https://)</Text>
            <Text style={styles.errorText}>• Test the URL in Safari first</Text>
            <Text style={styles.errorText}>• Ensure you're connected to WiFi</Text>
          </View>
        )}

        {users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎉 Success! Found {users.length} Users:</Text>
            {users.map((user, index) => (
              <View key={user.id || index} style={styles.userItem}>
                <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={[
                  styles.userRole, 
                  user.id.includes('coach') ? styles.trainer : styles.client
                ]}>
                  {user.id.includes('coach') ? 'Trainer' : 'Client'}
                </Text>
              </View>
            ))}
            
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>Mobile App Connected!</Text>
              <Text style={styles.successText}>
                Your iPhone is now successfully connected to the NexGen Fitness backend. 
                Mobile development is ready!
              </Text>
            </View>
          </View>
        )}

        <View style={styles.quickTestSection}>
          <Text style={styles.sectionTitle}>Quick Test URLs:</Text>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => testConnection('http://localhost:5001')}
          >
            <Text style={styles.quickButtonText}>Test Local Server</Text>
          </TouchableOpacity>
          <Text style={styles.quickHint}>
            (Only works if you're running local server on same network)
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
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
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
  status: {
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  success: {
    color: '#155724',
    backgroundColor: '#d4edda',
  },
  error: {
    color: '#721c24',
    backgroundColor: '#f8d7da',
  },
  neutral: {
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  userItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 12,
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
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
  quickTestSection: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  quickButton: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  quickButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quickHint: {
    fontSize: 11,
    color: '#1976d2',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});