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
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import FinalMigration from './FinalMigration';

export default function App() {
  const [apiUrl] = useState('https://ai-companion-jgsavage98.replit.app');
  const [showApiInput, setShowApiInput] = useState(false);

  const handleBack = () => {
    setShowApiInput(true);
  };

  if (showApiInput) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.setupContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.title}>NexGen Fitness</Text>
            <Text style={styles.subtitle}>Web App Migration - iOS Version</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Connected to Production Server:</Text>
            <Text style={styles.urlText}>{apiUrl}</Text>
            <TouchableOpacity style={styles.submitButton} onPress={() => setShowApiInput(false)}>
              <Text style={styles.submitButtonText}>Launch Fitness App</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>This is the Web App Migration</Text>
            <Text style={styles.infoText}>
              This version replicates your original web application design with:
            </Text>
            <Text style={styles.infoItem}>• Dark theme matching your web app</Text>
            <Text style={styles.infoItem}>• Tab navigation (Dashboard, Nutrition, Workout, Chat, Progress)</Text>
            <Text style={styles.infoItem}>• Macro tracking with progress bars</Text>
            <Text style={styles.infoItem}>• User profile header with journey day</Text>
            <Text style={styles.infoItem}>• Badge notifications for chat</Text>
            <Text style={styles.infoItem}>• Authentic user data and styling</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return <FinalMigration apiUrl={apiUrl} onBack={handleBack} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  setupContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  urlText: {
    fontSize: 14,
    color: '#4CAF50',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoItem: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 6,
    lineHeight: 20,
  },
});