import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDistance } from 'geolib';
import type { LocationObject } from 'expo-location';

const MANUAL_PAUSE_KEY = 'groupleveling_recording_manual_pause';
const MOVING_SECONDS_KEY = 'groupleveling_recording_moving_seconds';
const MOVING_LAST_TICK_MS_KEY = 'groupleveling_recording_moving_last_tick_ms';
const AUTO_PAUSE_KEY = 'groupleveling_recording_auto_pause';

/** Below this: treat as stopped (m/s). Strava-like. */
const LOW_SPEED_MPS = 0.45;
/** Above this: treat as moving again (m/s). */
const HIGH_SPEED_MPS = 1.1;
const PAUSE_HOLD_MS = 3200;
const RESUME_HOLD_MS = 2000;
const MAX_MOVING_SEGMENT_SEC = 45;
/** If GPS has no speed, "stationary" when within this radius for long enough (m). */
const STATIONARY_RADIUS_M = 6;
/** One-step jump suggests movement after standing (resume). */
const RESUME_JUMP_M = 10;

let lowSpeedStreakMs = 0;
let highSpeedStreakMs = 0;
let lastLat: number | null = null;
let lastLng: number | null = null;
let lastTimeMs: number | null = null;

export async function resetRecordingPauseState(): Promise<void> {
  lowSpeedStreakMs = 0;
  highSpeedStreakMs = 0;
  lastLat = null;
  lastLng = null;
  lastTimeMs = null;
  await AsyncStorage.multiRemove([
    MANUAL_PAUSE_KEY,
    MOVING_SECONDS_KEY,
    MOVING_LAST_TICK_MS_KEY,
    AUTO_PAUSE_KEY,
  ]);
  const now = Date.now();
  await AsyncStorage.setItem(MOVING_SECONDS_KEY, '0');
  await AsyncStorage.setItem(MOVING_LAST_TICK_MS_KEY, String(now));
  await AsyncStorage.setItem(AUTO_PAUSE_KEY, '0');
}

export async function clearRecordingPauseState(): Promise<void> {
  lowSpeedStreakMs = 0;
  highSpeedStreakMs = 0;
  lastLat = null;
  lastLng = null;
  lastTimeMs = null;
  await AsyncStorage.multiRemove([
    MANUAL_PAUSE_KEY,
    MOVING_SECONDS_KEY,
    MOVING_LAST_TICK_MS_KEY,
    AUTO_PAUSE_KEY,
  ]);
}

export async function setManualPause(paused: boolean): Promise<void> {
  await AsyncStorage.setItem(MANUAL_PAUSE_KEY, paused ? '1' : '0');
  await AsyncStorage.setItem(MOVING_LAST_TICK_MS_KEY, String(Date.now()));
  if (paused) {
    lowSpeedStreakMs = 0;
    highSpeedStreakMs = 0;
  }
}

export async function isManualPauseAsync(): Promise<boolean> {
  return (await AsyncStorage.getItem(MANUAL_PAUSE_KEY)) === '1';
}

export async function isAutoPauseAsync(): Promise<boolean> {
  return (await AsyncStorage.getItem(AUTO_PAUSE_KEY)) === '1';
}

export async function isAnyPauseAsync(): Promise<boolean> {
  const [m, a] = await Promise.all([isManualPauseAsync(), isAutoPauseAsync()]);
  return m || a;
}

export async function getMovingSecondsAsync(): Promise<number> {
  const v = await AsyncStorage.getItem(MOVING_SECONDS_KEY);
  const n = v != null ? Number(v) : 0;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function setAutoPaused(paused: boolean): Promise<void> {
  await AsyncStorage.setItem(AUTO_PAUSE_KEY, paused ? '1' : '0');
}

function effectiveSpeedMps(loc: LocationObject, nowMs: number): number | null {
  const s = loc.coords.speed;
  if (s != null && s >= 0 && s < 85) return s;
  if (lastLat == null || lastLng == null || lastTimeMs == null) return null;
  const dtSec = (nowMs - lastTimeMs) / 1000;
  if (dtSec < 0.12) return null;
  const distM = getDistance(
    { latitude: lastLat, longitude: lastLng },
    { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
  );
  return distM / dtSec;
}

/**
 * Strava-style auto-pause: hold low speed / stationary, then hold higher speed or big step to resume.
 * Manual pause short-circuits (caller returns before distance/path).
 */
async function updateAutoPauseMachine(loc: LocationObject, nowMs: number): Promise<void> {
  if (await isManualPauseAsync()) {
    lowSpeedStreakMs = 0;
    highSpeedStreakMs = 0;
    lastLat = loc.coords.latitude;
    lastLng = loc.coords.longitude;
    lastTimeMs = nowMs;
    return;
  }

  const autoPaused = await isAutoPauseAsync();
  const dt = lastTimeMs != null ? Math.min(20000, Math.max(0, nowMs - lastTimeMs)) : 0;
  const speed = effectiveSpeedMps(loc, nowMs);

  if (lastLat != null && lastLng != null && autoPaused) {
    const step = getDistance(
      { latitude: lastLat, longitude: lastLng },
      { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
    );
    if (step >= RESUME_JUMP_M) {
      await setAutoPaused(false);
      highSpeedStreakMs = 0;
      lowSpeedStreakMs = 0;
      lastLat = loc.coords.latitude;
      lastLng = loc.coords.longitude;
      lastTimeMs = nowMs;
      return;
    }
  }

  if (autoPaused) {
    if (speed != null && speed >= HIGH_SPEED_MPS) {
      highSpeedStreakMs += dt;
      lowSpeedStreakMs = 0;
      if (highSpeedStreakMs >= RESUME_HOLD_MS) {
        await setAutoPaused(false);
        highSpeedStreakMs = 0;
      }
    } else {
      highSpeedStreakMs = 0;
    }
    lastLat = loc.coords.latitude;
    lastLng = loc.coords.longitude;
    lastTimeMs = nowMs;
    return;
  }

  let considerSlow = false;
  if (speed != null) considerSlow = speed < LOW_SPEED_MPS;
  else if (lastLat != null && lastLng != null && dt > 0) {
    const distM = getDistance(
      { latitude: lastLat, longitude: lastLng },
      { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
    );
    considerSlow = distM < STATIONARY_RADIUS_M;
  }

  if (considerSlow) {
    lowSpeedStreakMs += dt;
    highSpeedStreakMs = 0;
    if (lowSpeedStreakMs >= PAUSE_HOLD_MS) {
      await setAutoPaused(true);
      lowSpeedStreakMs = 0;
    }
  } else {
    lowSpeedStreakMs = 0;
    highSpeedStreakMs = 0;
  }

  lastLat = loc.coords.latitude;
  lastLng = loc.coords.longitude;
  lastTimeMs = nowMs;
}

/** When a sample is dropped for poor accuracy, still advance moving clock while not paused. */
export async function tickMovingTimeForFilteredSample(): Promise<void> {
  const paused = await isAnyPauseAsync();
  await accumulateMovingTime(paused, Date.now());
}

async function accumulateMovingTime(isPaused: boolean, nowMs: number): Promise<void> {
  const raw = await AsyncStorage.getItem(MOVING_LAST_TICK_MS_KEY);
  let lastTick = raw != null ? Number(raw) : nowMs;
  if (!Number.isFinite(lastTick)) lastTick = nowMs;

  if (isPaused) {
    await AsyncStorage.setItem(MOVING_LAST_TICK_MS_KEY, String(nowMs));
    return;
  }

  const deltaS = Math.min(MAX_MOVING_SEGMENT_SEC, Math.max(0, (nowMs - lastTick) / 1000));
  const prev = Number(await AsyncStorage.getItem(MOVING_SECONDS_KEY)) || 0;
  await AsyncStorage.setItem(MOVING_SECONDS_KEY, String(prev + deltaS));
  await AsyncStorage.setItem(MOVING_LAST_TICK_MS_KEY, String(nowMs));
}

/**
 * Call from `applyLocationSample` after accuracy filter: updates auto-pause, moving time, and
 * returns whether to skip path + distance (paused).
 */
export async function applyPauseAndMovingTime(loc: LocationObject): Promise<{ skipRecording: boolean }> {
  const now = Date.now();
  const manual = await isManualPauseAsync();
  if (manual) {
    await updateAutoPauseMachine(loc, now);
    await accumulateMovingTime(true, now);
    return { skipRecording: true };
  }

  await updateAutoPauseMachine(loc, now);
  const paused = await isAnyPauseAsync();
  await accumulateMovingTime(paused, now);
  return { skipRecording: paused };
}
