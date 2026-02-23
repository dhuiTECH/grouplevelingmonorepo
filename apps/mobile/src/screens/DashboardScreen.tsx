import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, Dimensions, Platform, ActivityIndicator, Alert,  } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PieChart } from 'react-native-chart-kit';
import { useAudio } from '@/contexts/AudioContext';

// Import assets
import logo from '../../assets/icon.png';

interface DashboardScreenProps {}

const wait = (timeout: number) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const DashboardScreen: React.FC<DashboardScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'Dashboard'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { playTrack } = useAudio();

  // Play Dashboard music on focus
  useFocusEffect(
    useCallback(() => {
      playTrack('Dashboard');
    }, [playTrack])
  );

  // State variables
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    totalTasks: 50,
    completedTasks: 35,
    averageCompletionTime: '2 days',
    streak: 7,
  });
  const [chartData, setChartData] = useState([
    {
      name: 'Completed',
      population: 35,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Pending',
      population: 15,
      color: '#F44336',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
  ]);

  // Mock data fetching (replace with actual API calls)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate API call delay
        await wait(1500);

        // Update state with fetched data (replace with actual data)
        setUserStats({
          totalTasks: 60,
          completedTasks: 45,
          averageCompletionTime: '1.5 days',
          streak: 10,
        });
        setChartData([
          {
            name: 'Completed',
            population: 45,
            color: '#4CAF50',
            legendFontColor: '#7F7F7F',
            legendFontSize: 15,
          },
          {
            name: 'Pending',
            population: 15,
            color: '#F44336',
            legendFontColor: '#7F7F7F',
            legendFontSize: 15,
          },
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    wait(2000).then(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }, []);

  const handleWidgetPress = (widgetName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to relevant screen based on widget
    switch (widgetName) {
      case 'Tasks':
        navigation.navigate('Tasks');
        break;
      case 'Settings':
        navigation.navigate('Settings');
        break;
      default:
        Alert.alert('Info', `Navigating to ${widgetName} screen (not implemented)`);
    }
  };

  const screenWidth = Dimensions.get('window').width;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { marginTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.totalTasks}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.averageCompletionTime}</Text>
            <Text style={styles.statLabel}>Avg. Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Task Completion</Text>
          <PieChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: '#e26a00',
              backgroundGradientFrom: '#fb8c00',
              backgroundGradientTo: '#ffa726',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#ffa726',
              },
            }}
            accessor={'population'}
            backgroundColor={'transparent'}
            paddingLeft={'15'}
            center={[10, 0]}
            absolute
          />
        </View>

        {/* Widgets */}
        <View style={styles.widgetsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.widgetRow}>
            <TouchableOpacity
              style={styles.widget}
              onPress={() => handleWidgetPress('Tasks')}
            >
              <Text style={styles.widgetText}>Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.widget}
              onPress={() => handleWidgetPress('Settings')}
            >
              <Text style={styles.widgetText}>Settings</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.widgetRow}>
            <TouchableOpacity
              style={styles.widget}
              onPress={() => handleWidgetPress('Profile')}
            >
              <Text style={styles.widgetText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.widget}
              onPress={() => handleWidgetPress('Help')}
            >
              <Text style={styles.widgetText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  scrollView: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#555',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  widgetsContainer: {
    paddingHorizontal: 16,
  },
  widgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  widget: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 3,
    width: '45%',
  },
  widgetText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DashboardScreen;