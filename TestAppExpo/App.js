import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';

export default function App() {
  const [apiUrl, setApiUrl] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Enter your Replit URL to begin');

  // Test connection to any server URL
  const testConnection = async (urlToTest = apiUrl) => {
    if (!urlToTest || !urlToTest.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with https://');
      return;
    }

    setLoading(true);
    setConnectionStatus('Testing connection...');
    setError('');
    
    try {
      console.log('Testing connection to:', urlToTest);
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
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
      setConnectionStatus(`✅ SUCCESS! Connected to NexGen Fitness - Found ${data.length} users`);
      setError('');
      
    } catch (err) {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>NexGen Fitness</Text>
        <Text style={styles.subtitle}>Mobile Connection Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 iPhone + Replit Connection</Text>
          <Text style={styles.description}>
            Since local network connection failed, let's connect directly to your Replit server.
          </Text>
        </View>

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
              {loading ? 'Testing...' : 'Test Replit Connection'}
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
              <View key={user.id || index} style={styles.userItem}>
                <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={[
                  styles.userRole, 
                  user.id.includes('coach') ? styles.trainer : styles.client
                ]}>
                  {user.id.includes('coach') ? '👩‍🏫 Trainer' : '👤 Client'}
                </Text>
              </View>
            ))}
            
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>Mobile Development Ready!</Text>
              <Text style={styles.successText}>
                Your iPhone is now connected to the NexGen Fitness backend via Replit. 
                You can now develop mobile features using authentic user data.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Mobile Development Setup Complete</Text>
          <Text style={styles.infoText}>
            iPhone + Expo Go + Replit Backend{'\n'}
            Real fitness user database{'\n'}
            Ready for mobile app development
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
    shadowOffset: { width: 0, height: 2 },
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