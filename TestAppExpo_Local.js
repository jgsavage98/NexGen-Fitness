import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';

// Use local Mac backend - this should work since your backend is running on port 5001
const API_BASE_URL = 'http://localhost:5001';

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionTest, setConnectionTest] = useState('');

  // Test basic network connectivity
  const testConnection = async () => {
    setConnectionTest('Testing connection...');
    try {
      console.log('Testing connection to:', API_BASE_URL);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/available-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      setUsers(data);
      setConnectionTest(`SUCCESS: Connected to local backend! Found ${data.length} users`);
      setError('');
      
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      setConnectionTest(`FAILED: ${err.message}`);
    }
  };

  useEffect(() => {
    // Test connection on app start
    testConnection();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>NexGen Fitness - iOS Simulator Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backend URL:</Text>
          <Text style={styles.url}>{API_BASE_URL}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status:</Text>
          <Text style={[styles.status, error ? styles.error : styles.success]}>
            {connectionTest || 'Initializing...'}
          </Text>
        </View>

        {error && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error Details:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={testConnection}>
          <Text style={styles.buttonText}>Test Connection Again</Text>
        </TouchableOpacity>

        {users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ SUCCESS! Users Found ({users.length}):</Text>
            {users.slice(0, 5).map((user, index) => (
              <TouchableOpacity 
                key={user.id || index} 
                style={styles.userItem}
                onPress={() => Alert.alert('User Selected', `${user.firstName} ${user.lastName}\n${user.email}`)}
              >
                <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userRole}>{user.id.includes('coach') ? 'Trainer' : 'Client'}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.successMessage}>
              🎉 iOS Simulator successfully connected to NexGen Fitness local backend!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    fontFamily: 'monospace',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  success: {
    color: '#28a745',
  },
  error: {
    color: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
    marginBottom: 5,
    paddingHorizontal: 10,
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
    color: '#007bff',
    fontWeight: '500',
    marginTop: 2,
  },
  successMessage: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#d4edda',
    borderRadius: 5,
  },
});