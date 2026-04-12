import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  getRecordingDistanceMeters,
  resetRecordingSession,
} from '@/lib/runRecordingDb';
import {
  resetRecordingPauseState,
  clearRecordingPauseState,
  setManualPause,
  isManualPauseAsync,
  isAutoPauseAsync,
  getMovingSecondsAsync,
} from '@/lib/runRecordingPause';
import { getRunRecordingMode } from '@/config/runRecordingMode';
import { applyLocationSample } from '@/lib/runRecordingLocation';
import { LOCATION_TASK_NAME } from '@/tasks/locationTask';

const RECORDING_STARTED_AT_KEY = 'groupleveling_recording_started_at_ms';

export interface BackgroundRecordingStopReport {
  distance: number;
  /** Moving time (seconds) — excludes manual + auto-pause; used for pace and dungeon match. */
  duration: number;
  /** Wall-clock elapsed from start to stop (includes pauses). */
  elapsedSeconds: number;
  elevationGain: number;
  timeToTargetSeconds: null;
}

export function useBackgroundRunRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [distance, setDistance] = useState(0);
  /** Moving time (Strava-style), not wall clock */
  const [duration, setDuration] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<'manual' | 'auto' | null>(null);

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

  const tickTimesAndPause = useCallback(async () => {
    const raw = await AsyncStorage.getItem(RECORDING_STARTED_AT_KEY);
    const started = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(started)) {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }
    const moving = await getMovingSecondsAsync();
    setDuration(Math.floor(moving));
    const manual = await isManualPauseAsync();
    const auto = await isAutoPauseAsync();
    setIsPaused(manual || auto);
    setPauseReason(manual ? 'manual' : auto ? 'auto' : null);
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
      await resetRecordingPauseState();

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
      setElapsedSeconds(0);
      setIsPaused(false);
      setPauseReason(null);

      pollRef.current = setInterval(() => {
        void pollDistance();
        void tickTimesAndPause();
      }, 1000);
      durationTimerRef.current = setInterval(() => {
        void tickTimesAndPause();
      }, 1000);

      return true;
    } catch (e) {
      console.error('[useBackgroundRunRecorder] startRecording', e);
      return false;
    } finally {
      startInProgressRef.current = false;
    }
  }, [pollDistance, tickTimesAndPause, stopForegroundWatch]);

  const pauseRecording = useCallback(async () => {
    await setManualPause(true);
    setIsPaused(true);
    setPauseReason('manual');
    void tickTimesAndPause();
  }, [tickTimesAndPause]);

  const resumeRecording = useCallback(async () => {
    await setManualPause(false);
    void tickTimesAndPause();
  }, [tickTimesAndPause]);

  const stopRecording = useCallback(async (): Promise<BackgroundRecordingStopReport> => {
    clearTimers();
    stopForegroundWatch();

    const startedRaw = await AsyncStorage.getItem(RECORDING_STARTED_AT_KEY);
    await AsyncStorage.removeItem(RECORDING_STARTED_AT_KEY);

    const started = startedRaw != null ? Number(startedRaw) : NaN;
    const wallDuration =
      Number.isFinite(started) ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;

    const movingSeconds = Math.floor(await getMovingSecondsAsync());

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
    setIsPaused(false);
    setPauseReason(null);
    setDistance(dist);
    setDuration(movingSeconds);
    setElapsedSeconds(wallDuration);

    await clearRecordingPauseState();

    return {
      distance: dist,
      duration: movingSeconds,
      elapsedSeconds: wallDuration,
      elevationGain: 0,
      timeToTargetSeconds: null,
    };
  }, [clearTimers, stopForegroundWatch]);

  return {
    isRecording,
    distance,
    duration,
    elapsedSeconds,
    isPaused,
    pauseReason,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
