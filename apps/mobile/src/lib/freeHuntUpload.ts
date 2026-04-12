import polyline from '@mapbox/polyline';
import { supabase } from '@/lib/supabase';
import { resetRecordingSession } from '@/lib/runRecordingDb';
import {
  readRecordingPathCoordinates,
  type RecordingCoordinateRow,
} from '@/lib/readRecordingPath';
import { coordsToLineStringWkt, haversinePathLengthMeters } from '@/utils/haversine';
import { freeRoamXpFromDistanceMeters } from '@/lib/runRewards';
import { formatSupabaseErrorMessage } from '@/lib/supabaseErrors';

/** Keeps PostgREST / PostGIS payloads reasonable on long runs (many GPS samples per second). */
const MAX_VERTICES_FOR_WKT = 2000;

function downsamplePointsForWkt<T extends { latitude: number; longitude: number }>(points: T[]): T[] {
  if (points.length <= MAX_VERTICES_FOR_WKT) return points;
  const step = Math.ceil(points.length / MAX_VERTICES_FOR_WKT);
  const out: T[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  const last = points[points.length - 1];
  const lastOut = out[out.length - 1];
  if (lastOut.latitude !== last.latitude || lastOut.longitude !== last.longitude) out.push(last);
  return out;
}

export interface FreeHuntInsertResult {
  distanceMeters: number;
  xpEarned: number;
  encodedPolyline: string;
}

function rowsToLatLngPoints(rows: RecordingCoordinateRow[]): { latitude: number; longitude: number }[] {
  return rows.map((r) => ({ latitude: r.lat, longitude: r.lng }));
}

/**
 * Reads SQLite path, computes Haversine distance + XP, inserts `free_hunts`, clears recording session.
 * Call after `stopRecording()` (points still in DB until this resets).
 */
export async function insertFreeHuntFromRecordingSession(): Promise<FreeHuntInsertResult> {
  const rows = await readRecordingPathCoordinates();
  if (rows.length < 2) {
    throw new Error('Not enough GPS points to record a run. Try a longer route.');
  }

  const points = rowsToLatLngPoints(rows);
  const distanceMeters = haversinePathLengthMeters(points);
  const xpEarned = freeRoamXpFromDistanceMeters(distanceMeters);
  const wktPoints = downsamplePointsForWkt(points);
  const pathWkt = coordsToLineStringWkt(wktPoints);
  if (!pathWkt) {
    throw new Error('Not enough GPS points to record a run. Try a longer route.');
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.warn('[freeHuntUpload] refreshSession before insert:', refreshError.message);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase.rpc('insert_free_hunt', {
    p_distance_meters: distanceMeters,
    p_xp_earned: xpEarned,
    p_path_wkt: pathWkt,
    p_user_id: userId,
  });

  if (error) throw new Error(formatSupabaseErrorMessage(error));

  const pairs: [number, number][] = rows.map((r) => [r.lat, r.lng]);
  const encodedPolyline = polyline.encode(pairs);

  await resetRecordingSession();

  return {
    distanceMeters,
    xpEarned,
    encodedPolyline,
  };
}
