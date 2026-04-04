/**
 * Pipeline for imported workouts (Apple Health / Google Fit). Native adapters call this with a normalized route.
 * Flip `EXPO_PUBLIC_ENABLE_EXTERNAL_WORKOUT_SYNC=true` after prebuild when adapters exist.
 */
import { supabase } from '@/lib/supabase';
import { ENABLE_EXTERNAL_WORKOUT_SYNC } from './env';
import { encodeRoutePolyline } from './encodePolyline';
import { parseFinishImportedRunPayload } from './parseFinishImportedRun';
import type { ExternalWorkoutRoute, ImportExternalWorkoutResult } from './types';

export async function importExternalWorkout(
  route: ExternalWorkoutRoute
): Promise<ImportExternalWorkoutResult> {
  if (!ENABLE_EXTERNAL_WORKOUT_SYNC) {
    return { kind: 'disabled' };
  }

  if (!route.points || route.points.length < 2) {
    return { kind: 'error', message: 'Need at least two GPS points.' };
  }
  const duration = Math.max(0, Math.floor(Number(route.durationSeconds) || 0));
  if (!route.startedAt || Number.isNaN(route.startedAt.getTime())) {
    return { kind: 'error', message: 'Workout start time is required.' };
  }

  const encoded = encodeRoutePolyline(route.points);

  try {
    const { data, error } = await supabase.rpc('finish_imported_run', {
      p_encoded_polyline: encoded,
      p_total_time_seconds: duration,
      p_workout_start: route.startedAt.toISOString(),
    });

    if (error) {
      return { kind: 'error', message: error.message };
    }

    const result = parseFinishImportedRunPayload(data);
    return { kind: 'success', result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed';
    return { kind: 'error', message: msg };
  }
}

/** Mock route for debug (fixed old start time → avoids dedupe collision with real runs). */
export function buildMockExternalWorkoutRoute(): ExternalWorkoutRoute {
  const startedAt = new Date('2019-06-01T18:00:00.000Z');
  return {
    points: [
      { latitude: 49.228, longitude: -123.012 },
      { latitude: 49.229, longitude: -123.011 },
      { latitude: 49.23, longitude: -123.01 },
    ],
    durationSeconds: 1800,
    startedAt,
    sourceId: 'mock-debug',
  };
}
