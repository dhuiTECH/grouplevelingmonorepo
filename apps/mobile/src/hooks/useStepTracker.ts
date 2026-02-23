import { useState, useEffect } from 'react';
import { AppState } from 'react-native'; 
import { Pedometer } from 'expo-sensors';
import { useAuth } from '@/contexts/AuthContext';

export const useStepTracker = () => {
  const { user } = useAuth();
  const [pendingSteps, setPendingSteps] = useState(0); // Steps waiting for user decision

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && user) {
        checkOfflineSteps();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    checkOfflineSteps(); // Also run on mount

    return () => sub.remove();
  }, [user]);

  const checkOfflineSteps = async () => {
    if (!user?.last_sync_time) return;

    const now = new Date();
    const lastSync = new Date(user.last_sync_time);
    
    const isAvailable = await Pedometer.isAvailableAsync();
    if (isAvailable) {
      try {
        const result = await Pedometer.getStepCountAsync(lastSync, now);
        // If we found steps, hold them in "Pending" to trigger the Modal
        if (result.steps > 50) setPendingSteps(result.steps); 
      } catch (error) {
        console.error("Error fetching step count:", error);
      }
    }
  };

  return { pendingSteps, setPendingSteps };
};
