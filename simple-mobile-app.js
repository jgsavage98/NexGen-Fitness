// Simple Expo app to verify the setup works
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NexGen Fitness</Text>
        <Text style={styles.subtitle}>Mobile App</Text>
        <Text style={styles.status}>✅ Expo Setup Working</Text>
        <Text style={styles.description}>
          This confirms your Expo environment is working correctly.
          Next step: Connect to backend API.
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  status: {
    fontSize: 18,
    color: '#27ae60',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    lineHeight: 24,
  },
});