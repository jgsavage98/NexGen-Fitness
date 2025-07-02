import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';

const API_BASE_URL = 'http://192.168.68.67:5001';

export default function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/available-users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      Alert.alert('Connection Error', 'Could not connect to backend. Make sure your backend is running.');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>NexGen Fitness</Text>
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>NexGen Fitness</Text>
          <Text style={styles.subtitle}>Mobile App - Connection Test</Text>
          
          <Text style={styles.sectionTitle}>Available Users:</Text>
          
          <ScrollView style={styles.userList}>
            {users.length > 0 ? (
              users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userButton}
                  onPress={() => selectUser(user)}
                >
                  <Text style={styles.userButtonText}>{user.firstName} {user.lastName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.errorText}>No users found. Check backend connection.</Text>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.refreshButton} onPress={fetchAvailableUsers}>
            <Text style={styles.refreshButtonText}>Refresh Connection</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome, {selectedUser.firstName}!</Text>
        <Text style={styles.successText}>✅ Backend Connection Successful</Text>
        <Text style={styles.subtitle}>NexGen Fitness Mobile App is working!</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Connection Details:</Text>
          <Text style={styles.infoText}>Backend: {API_BASE_URL}</Text>
          <Text style={styles.infoText}>User: {selectedUser.email}</Text>
          <Text style={styles.infoText}>Status: Connected</Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedUser(null)}>
          <Text style={styles.backButtonText}>Back to User Selection</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  successText: {
    fontSize: 18,
    color: '#27ae60',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  userList: {
    flex: 1,
    marginBottom: 20,
  },
  userButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  userButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#ecf0f1',
    fontSize: 14,
    marginTop: 5,
  },
  refreshButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  infoBox: {
    backgroundColor: '#ecf0f1',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 5,
  },
});