import polyline from '@mapbox/polyline';
import { supabase } from '@/lib/supabase';
import { resetRecordingSession } from '@/lib/runRecordingDb';
import {
  readRecordingPathCoordinates,
  type RecordingCoordinateRow,
} from '@/lib/readRecordingPath';
import { coordsToLineStringWkt, haversinePathLengthMeters } from '@/utils/haversine';

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
  const xpEarned = Math.floor(distanceMeters / 10);
  const pathWkt = coordsToLineStringWkt(points);
  if (!pathWkt) {
    throw new Error('Not enough GPS points to record a run. Try a longer route.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase.rpc('insert_free_hunt', {
    p_distance_meters: distanceMeters,
    p_xp_earned: xpEarned,
    p_path_wkt: pathWkt,
    p_user_id: userId,
  });

  if (error) throw error;

  const pairs: [number, number][] = rows.map((r) => [r.lat, r.lng]);
  const encodedPolyline = polyline.encode(pairs);

  await resetRecordingSession();

  return {
    distanceMeters,
    xpEarned,
    encodedPolyline,
  };
}
