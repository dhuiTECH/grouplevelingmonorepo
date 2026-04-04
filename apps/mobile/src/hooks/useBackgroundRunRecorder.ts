import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  getRecordingDistanceMeters,
  resetRecordingSession,
} from '@/lib/runRecordingDb';
import { getRunRecordingMode } from '@/config/runRecordingMode';
import { applyLocationSample } from '@/lib/runRecordingLocation';
import { LOCATION_TASK_NAME } from '@/tasks/locationTask';

const RECORDING_STARTED_AT_KEY = 'groupleveling_recording_started_at_ms';

export interface BackgroundRecordingStopReport {
  distance: number;
  duration: number;
  elevationGain: number;
  timeToTargetSeconds: null;
}

export function useBackgroundRunRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingActiveRef = useRef(false);
  const startInProgressRef = useRef(false);
  const foregroundWatchRef = useRef<Location.LocationSubscription | null>(null);

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const stopForegroundWatch = useCallback(() => {
    if (foregroundWatchRef.current) {
      foregroundWatchRef.current.remove();
      foregroundWatchRef.current = null;
    }
  }, []);

  const pollDistance = useCallback(async () => {
    const m = await getRecordingDistanceMeters();
    setDistance(m);
  }, []);

  const tickDuration = useCallback(async () => {
    const raw = await AsyncStorage.getItem(RECORDING_STARTED_AT_KEY);
    const started = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(started)) return;
    setDuration(Math.max(0, Math.floor((Date.now() - started) / 1000)));
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      stopForegroundWatch();
    };
  }, [clearTimers, stopForegroundWatch]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    if (recordingActiveRef.current) return true;
    if (startInProgressRef.current) return false;

    startInProgressRef.current = true;
    try {
      const mode = getRunRecordingMode();

      const fgExisting = await Location.getForegroundPermissionsAsync();
      const fg =
        fgExisting.status === Location.PermissionStatus.GRANTED
          ? fgExisting
          : await Location.requestForegroundPermissionsAsync();
      if (fg.status !== Location.PermissionStatus.GRANTED) return false;

      if (mode === 'background') {
        const bgExisting = await Location.getBackgroundPermissionsAsync();
        const bg =
          bgExisting.status === Location.PermissionStatus.GRANTED
            ? bgExisting
            : await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== Location.PermissionStatus.GRANTED) return false;
      }

      await resetRecordingSession();

      if (mode === 'foreground') {
        stopForegroundWatch();

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 1000,
          },
          (location) => {
            void applyLocationSample(location);
          }
        );
        foregroundWatchRef.current = sub;
      } else {
        const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (already) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          deferredUpdatesInterval: 60_000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Group Leveling',
            notificationBody: 'Recording your route',
            notificationColor: '#06b6d4',
          },
        });
      }

      await AsyncStorage.setItem(RECORDING_STARTED_AT_KEY, String(Date.now()));

      recordingActiveRef.current = true;
      setIsRecording(true);
      setDistance(0);
      setDuration(0);

      pollRef.current = setInterval(() => {
        void pollDistance();
        void tickDuration();
      }, 1000);
      durationTimerRef.current = setInterval(() => {
        void tickDuration();
      }, 1000);

      return true;
    } catch (e) {
      console.error('[useBackgroundRunRecorder] startRecording', e);
      return false;
    } finally {
      startInProgressRef.current = false;
    }
  }, [pollDistance, tickDuration, stopForegroundWatch]);

  const stopRecording = useCallback(async (): Promise<BackgroundRecordingStopReport> => {
    clearTimers();
    stopForegroundWatch();

    const startedRaw = await AsyncStorage.getItem(RECORDING_STARTED_AT_KEY);
    await AsyncStorage.removeItem(RECORDING_STARTED_AT_KEY);

    const started = startedRaw != null ? Number(startedRaw) : NaN;
    const wallDuration =
      Number.isFinite(started) ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : duration;

    const mode = getRunRecordingMode();
    if (mode === 'background') {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    }

    const dist = await getRecordingDistanceMeters();
    recordingActiveRef.current = false;
    setIsRecording(false);
    setDistance(dist);
    setDuration(wallDuration);

    return {
      distance: dist,
      duration: wallDuration,
      elevationGain: 0,
      timeToTargetSeconds: null,
    };
  }, [clearTimers, duration, stopForegroundWatch]);

  return {
    isRecording,
    distance,
    duration,
    startRecording,
    stopRecording,
  };
}
