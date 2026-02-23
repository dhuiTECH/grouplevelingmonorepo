import { useEffect, useState } from 'react';
import { Pedometer } from 'expo-sensors';

interface DailyStepsState {
  stepsToday: number;
  isAvailable: boolean | null;
  isLoading: boolean;
}

export function useDailyStepsProgress(): DailyStepsState {
  const [stepsToday, setStepsToday] = useState(0);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSteps = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!isMounted) return;

        setIsAvailable(available);
        if (!available) {
          setIsLoading(false);
          return;
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const result = await Pedometer.getStepCountAsync(startOfDay, now);
        if (!isMounted) return;

        setStepsToday(result.steps ?? 0);
      } catch (error) {
        console.error('useDailyStepsProgress error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSteps();

    return () => {
      isMounted = false;
    };
  }, []);

  return { stepsToday, isAvailable, isLoading };
}

