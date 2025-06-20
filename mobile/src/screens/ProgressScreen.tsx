import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');

interface ProgressEntry {
  id: number;
  weight: number;
  recordedAt: string;
  notes?: string;
}

interface WeightStats {
  currentWeight: number;
  previousWeight: number;
  weightChange: number;
  totalProgress: number;
  goalWeight: number;
}

export default function ProgressScreen() {
  const {user} = useAuth();
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Cookie': `auth_token=${token}`,
    };
  };

  const loadProgressData = async () => {
    try {
      const headers = await getAuthHeaders();

      // Load progress entries
      const progressResponse = await fetch(`${API_BASE_URL}/api/progress-entries`, {headers});
      if (progressResponse.ok) {
        const entries = await progressResponse.json();
        setProgressEntries(entries.slice(0, 10)); // Show last 10 entries
        
        if (entries.length > 0) {
          calculateWeightStats(entries);
        }
      }
    } catch (error) {
      console.error('Failed to load progress data:', error);
    }
  };

  const calculateWeightStats = (entries: ProgressEntry[]) => {
    if (entries.length === 0) return;

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    const currentWeight = sortedEntries[0].weight;
    const previousWeight = sortedEntries.length > 1 ? sortedEntries[1].weight : currentWeight;
    const weightChange = currentWeight - previousWeight;
    
    // These would come from user profile in a real app
    const goalWeight = 175; // Example goal
    const startWeight = entries.length > 0 ? Math.max(...entries.map(e => e.weight)) : currentWeight;
    const totalProgress = startWeight - currentWeight;

    setWeightStats({
      currentWeight,
      previousWeight,
      weightChange,
      totalProgress,
      goalWeight,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(1)} lbs`;
  };

  const renderWeightChart = () => {
    if (progressEntries.length < 2) return null;

    const chartWidth = width - 40;
    const chartHeight = 120;
    const padding = 20;
    
    const weights = progressEntries.map(entry => entry.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const weightRange = maxWeight - minWeight;

    const points = progressEntries.map((entry, index) => {
      const x = padding + (index * (chartWidth - 2 * padding)) / (progressEntries.length - 1);
      const y = chartHeight - padding - ((entry.weight - minWeight) / weightRange) * (chartHeight - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weight Trend</Text>
        <View style={styles.chart}>
          <Text style={styles.chartText}>📈 Weight progress over time</Text>
          <Text style={styles.chartSubtext}>
            {progressEntries.length} entries tracked
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Track your fitness journey</Text>
        </View>

        {/* Weight Stats */}
        {weightStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatWeight(weightStats.currentWeight)}</Text>
              <Text style={styles.statLabel}>Current Weight</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[
                styles.statValue,
                weightStats.weightChange > 0 ? styles.weightGain : styles.weightLoss
              ]}>
                {weightStats.weightChange > 0 ? '+' : ''}{weightStats.weightChange.toFixed(1)} lbs
              </Text>
              <Text style={styles.statLabel}>Recent Change</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatWeight(weightStats.goalWeight)}</Text>
              <Text style={styles.statLabel}>Goal Weight</Text>
            </View>
          </View>
        )}

        {/* Weight Chart */}
        {renderWeightChart()}

        {/* Recent Entries */}
        <View style={styles.entriesContainer}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          
          {progressEntries.length > 0 ? (
            progressEntries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryWeight}>{formatWeight(entry.weight)}</Text>
                  <Text style={styles.entryDate}>{formatDate(entry.recordedAt)}</Text>
                </View>
                {entry.notes && (
                  <Text style={styles.entryNotes}>{entry.notes}</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No progress entries yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Weight tracking will appear here once you start logging
              </Text>
            </View>
          )}
        </View>

        {/* Progress Insights */}
        {weightStats && weightStats.totalProgress !== 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Insights</Text>
            
            <View style={styles.insightCard}>
              <Text style={styles.insightText}>
                You've {weightStats.totalProgress > 0 ? 'lost' : 'gained'} {' '}
                <Text style={styles.insightValue}>
                  {Math.abs(weightStats.totalProgress).toFixed(1)} lbs
                </Text>
                {' '}since you started tracking
              </Text>
            </View>
            
            <View style={styles.insightCard}>
              <Text style={styles.insightText}>
                You're {' '}
                <Text style={styles.insightValue}>
                  {Math.abs(weightStats.currentWeight - weightStats.goalWeight).toFixed(1)} lbs
                </Text>
                {' '}away from your goal weight
              </Text>
            </View>
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
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  weightGain: {
    color: '#ff6b6b',
  },
  weightLoss: {
    color: '#51cf66',
  },
  chartContainer: {
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
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  chartText: {
    fontSize: 16,
    color: '#666',
  },
  chartSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  entriesContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entryDate: {
    fontSize: 14,
    color: '#666',
  },
  entryNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  insightsContainer: {
    margin: 16,
    marginBottom: 32,
  },
  insightCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  insightValue: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
});