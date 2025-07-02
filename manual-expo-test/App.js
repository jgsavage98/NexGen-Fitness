import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NexGen Fitness</Text>
      <Text style={styles.subtitle}>Mobile App Test</Text>
      <Text style={styles.status}>✅ Manual Expo Setup Working</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
});