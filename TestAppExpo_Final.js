import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';

// Multiple endpoint options for testing
const ENDPOINTS = {
  localhost: 'http://localhost:5001',
  networkIP: 'http://192.168.68.67:5001',
  // iOS simulator often uses 127.0.0.1 instead of localhost
  loopback: 'http://127.0.0.1:5001',
};

export default function App() {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [successfulEndpoint, setSuccessfulEndpoint] = useState(null);

  const testEndpoint = async (name, url) => {
    console.log(`Testing ${name}: ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/api/auth/available-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`${name} SUCCESS:`, data.length, 'users');
      
      return {
        name,
        url,
        status: 'SUCCESS',
        userCount: data.length,
        users: data.slice(0, 3), // Show first 3 users
        error: null,
      };
      
    } catch (error) {
      console.log(`${name} FAILED:`, error.message);
      return {
        name,
        url,
        status: 'FAILED',
        userCount: 0,
        users: [],
        error: error.message,
      };
    }
  };

  const testAllEndpoints = async () => {
    setTesting(true);
    setResults([]);
    setSuccessfulEndpoint(null);
    
    console.log('Starting comprehensive endpoint testing...');
    
    const testResults = [];
    
    for (const [name, url] of Object.entries(ENDPOINTS)) {
      const result = await testEndpoint(name, url);
      testResults.push(result);
      
      if (result.status === 'SUCCESS' && !successfulEndpoint) {
        setSuccessfulEndpoint(result);
      }
    }
    
    setResults(testResults);
    setTesting(false);
    
    console.log('All tests completed');
  };

  useEffect(() => {
    testAllEndpoints();
  }, []);

  const renderResult = (result) => (
    <View key={result.name} style={[
      styles.resultCard,
      result.status === 'SUCCESS' ? styles.successCard : styles.errorCard
    ]}>
      <Text style={styles.resultTitle}>{result.name}</Text>
      <Text style={styles.resultUrl}>{result.url}</Text>
      <Text style={[
        styles.resultStatus,
        result.status === 'SUCCESS' ? styles.successText : styles.errorText
      ]}>
        {result.status === 'SUCCESS' ? 
          `✅ SUCCESS (${result.userCount} users)` : 
          `❌ FAILED: ${result.error}`
        }
      </Text>
      
      {result.status === 'SUCCESS' && result.users.length > 0 && (
        <View style={styles.userList}>
          <Text style={styles.userListTitle}>Sample Users:</Text>
          {result.users.map((user, index) => (
            <Text key={index} style={styles.userItem}>
              • {user.firstName} {user.lastName}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>NexGen Fitness iOS Connection Test</Text>
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Platform: {Platform.OS}</Text>
          <Text style={styles.infoText}>
            Testing multiple backend endpoints to find working connection
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, testing && styles.buttonDisabled]} 
          onPress={testAllEndpoints}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Testing...' : 'Test All Endpoints'}
          </Text>
        </TouchableOpacity>

        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Test Results:</Text>
            {results.map(renderResult)}
          </View>
        )}

        {successfulEndpoint && (
          <View style={styles.successSection}>
            <Text style={styles.successTitle}>🎉 CONNECTION ESTABLISHED!</Text>
            <Text style={styles.successText}>
              iOS Simulator successfully connected to NexGen Fitness backend via {successfulEndpoint.name}
            </Text>
            <Text style={styles.successDetails}>
              Found {successfulEndpoint.userCount} users in the fitness database
            </Text>
          </View>
        )}

        {results.length > 0 && !successfulEndpoint && (
          <View style={styles.failureSection}>
            <Text style={styles.failureTitle}>⚠️ No Connection Available</Text>
            <Text style={styles.failureText}>
              None of the backend endpoints are accessible from iOS Simulator.
              This may be due to network restrictions or firewall settings.
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
    marginBottom: 20,
    color: '#333',
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultUrl: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    marginBottom: 5,
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  successText: {
    color: '#155724',
  },
  errorText: {
    color: '#721c24',
  },
  userList: {
    marginTop: 5,
  },
  userListTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  userItem: {
    fontSize: 11,
    color: '#666',
  },
  successSection: {
    backgroundColor: '#d4edda',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#28a745',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#155724',
    textAlign: 'center',
    marginBottom: 5,
  },
  successDetails: {
    fontSize: 14,
    color: '#155724',
    textAlign: 'center',
  },
  failureSection: {
    backgroundColor: '#f8d7da',
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  failureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#721c24',
    textAlign: 'center',
    marginBottom: 10,
  },
  failureText: {
    fontSize: 14,
    color: '#721c24',
    textAlign: 'center',
  },
});