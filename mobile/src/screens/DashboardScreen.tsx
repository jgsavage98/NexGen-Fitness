import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyMacros {
  extractedCalories: number;
  extractedProtein: number;
  extractedCarbs: number;
  extractedFat: number;
  hungerLevel: number;
  energyLevel: number;
}

interface TodaysWorkout {
  name: string;
  description: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
  }>;
}

export default function DashboardScreen() {
  const {user, logout} = useAuth();
  const [macroTargets, setMacroTargets] = useState<MacroTargets | null>(null);
  const [dailyMacros, setDailyMacros] = useState<DailyMacros | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<TodaysWorkout | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUploadedToday, setHasUploadedToday] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Cookie': `auth_token=${token}`,
    };
  };

  const loadDashboardData = async () => {
    try {
      const headers = await getAuthHeaders();

      // Load macro targets
      const targetsResponse = await fetch(`${API_BASE_URL}/api/macro-targets`, {headers});
      if (targetsResponse.ok) {
        const targets = await targetsResponse.json();
        setMacroTargets(targets);
      }

      // Load today's macros
      const macrosResponse = await fetch(`${API_BASE_URL}/api/daily-macros`, {headers});
      if (macrosResponse.ok) {
        const macros = await macrosResponse.json();
        setDailyMacros(macros);
        setHasUploadedToday(true);
      } else {
        setHasUploadedToday(false);
      }

      // Load today's workout
      const workoutResponse = await fetch(`${API_BASE_URL}/api/workout/today`, {headers});
      if (workoutResponse.ok) {
        const workout = await workoutResponse.json();
        setTodaysWorkout(workout);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.firstName}!</Text>
            <Text style={styles.subtitle}>Here's your progress today</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Macro Upload Status */}
        <View style={[styles.card, hasUploadedToday ? styles.successCard : styles.warningCard]}>
          <Text style={styles.cardTitle}>
            {hasUploadedToday ? 'Today\'s Upload Complete' : 'Upload Your Macros'}
          </Text>
          {hasUploadedToday ? (
            <Text style={styles.cardSubtitle}>Great job staying on track!</Text>
          ) : (
            <Text style={styles.cardSubtitle}>Tap Camera tab to log your nutrition</Text>
          )}
        </View>

        {/* Macro Targets */}
        {macroTargets && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Macro Targets</Text>
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{macroTargets.calories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{macroTargets.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{macroTargets.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{macroTargets.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Uploaded Macros */}
        {dailyMacros && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Uploaded Macros</Text>
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyMacros.extractedCalories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyMacros.extractedProtein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyMacros.extractedCarbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyMacros.extractedFat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            
            {/* Hunger & Energy Levels */}
            <View style={styles.levelRow}>
              <View style={styles.levelItem}>
                <Text style={styles.levelLabel}>Hunger Level</Text>
                <Text style={styles.levelValue}>{dailyMacros.hungerLevel}/5</Text>
              </View>
              <View style={styles.levelItem}>
                <Text style={styles.levelLabel}>Energy Level</Text>
                <Text style={styles.levelValue}>{dailyMacros.energyLevel}/5</Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Workout */}
        {todaysWorkout && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Workout</Text>
            <Text style={styles.workoutName}>{todaysWorkout.name}</Text>
            <Text style={styles.workoutDescription}>{todaysWorkout.description}</Text>
            
            {todaysWorkout.exercises && todaysWorkout.exercises.length > 0 && (
              <View style={styles.exerciseList}>
                {todaysWorkout.exercises.slice(0, 3).map((exercise, index) => (
                  <View key={index} style={styles.exerciseItem}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps}
                    </Text>
                  </View>
                ))}
                {todaysWorkout.exercises.length > 3 && (
                  <Text style={styles.moreExercises}>
                    +{todaysWorkout.exercises.length - 3} more exercises
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  logoutText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  levelItem: {
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 14,
    color: '#666',
  },
  levelValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 4,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  exerciseList: {
    marginTop: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  exerciseName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
  },
  moreExercises: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8,
  },
});