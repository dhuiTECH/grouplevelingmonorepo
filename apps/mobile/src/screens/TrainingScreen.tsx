import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert, Platform, Vibration,  } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Import assets (if needed)
// import logo from '../../assets/icon.png'; // Example

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface TrainingScreenProps {}

export const TrainingScreen: React.FC<TrainingScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'Training'>['navigation']>();
  const [trainingTime, setTrainingTime] = useState<number>(60); // Default 60 seconds
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(trainingTime);
  const [progress, setProgress] = useState<number>(0);
  const [notificationToken, setNotificationToken] = useState<string | undefined>(undefined);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const { top, bottom } = useSafeAreaInsets();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    setTimeRemaining(trainingTime);
    setProgress(0);
  }, [trainingTime]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
        setProgress((prevTime) => 1 - (prevTime - 1) / trainingTime);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsRunning(false);
      Vibration.vibrate([500, 500, 500]); // Vibrate on completion
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      schedulePushNotification();
    }

    return () => clearInterval(intervalId);
  }, [isRunning, timeRemaining, trainingTime]);

  const startTraining = () => {
    setIsRunning(true);
  };

  const pauseTraining = () => {
    setIsRunning(false);
  };

  const resetTraining = () => {
    setIsRunning(false);
    setTimeRemaining(trainingTime);
    setProgress(0);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  async function schedulePushNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Training Complete! 🎉",
        body: 'Great job on finishing your training session!',
        data: { data: 'goes here' },
      },
      trigger: { seconds: 1 },
    });
  }

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log(token);
    } else {
      alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Training Session</Text>
          </View>

          {/* Timer Display */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {!isRunning ? (
              <TouchableOpacity style={styles.button} onPress={startTraining}>
                <Text style={styles.buttonText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.button} onPress={pauseTraining}>
                <Text style={styles.buttonText}>Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.button} onPress={resetTraining}>
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Training Time Selection */}
          <View style={styles.timeSelectionContainer}>
            <Text style={styles.timeSelectionLabel}>Training Time (seconds):</Text>
            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => setTrainingTime(30)}
            >
              <Text style={styles.timeOptionText}>30s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => setTrainingTime(60)}
            >
              <Text style={styles.timeOptionText}>60s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => setTrainingTime(90)}
            >
              <Text style={styles.timeOptionText}>90s</Text>
            </TouchableOpacity>
          </View>

          {/* Optional: Display notification data */}
          {notification && (
            <View style={styles.notificationContainer}>
              <Text style={styles.notificationText}>
                Notification Data: {JSON.stringify(notification.request.content.data)}
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerContainer: {
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBarContainer: {
    width: '80%',
    height: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: 10,
    backgroundColor: 'green',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeSelectionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeSelectionLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#fff',
  },
  timeOption: {
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  timeOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  notificationContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  notificationText: {
    fontSize: 12,
  },
});

export default TrainingScreen;