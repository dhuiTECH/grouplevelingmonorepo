import polyline from '@mapbox/polyline';
import { supabase } from '@/lib/supabase';
import { getRecordingDb, resetRecordingSession } from '@/lib/runRecordingDb';

export interface UploadRunResult {
  encodedPolyline: string;
  matchedDungeonId: string | null;
}

export async function uploadRun(totalTimeSeconds: number): Promise<UploadRunResult> {
  const db = await getRecordingDb();
  const rows = await db.getAllAsync<{ lat: number; lng: number }>(
    'SELECT lat, lng FROM temp_coordinates ORDER BY id ASC'
  );

  if (rows.length < 2) {
    throw new Error('Not enough GPS points to record a run. Try a longer route.');
  }

  const pairs: [number, number][] = rows.map((r: { lat: number; lng: number }) => [r.lat, r.lng]);
  const encodedPolyline = polyline.encode(pairs);

  const { data, error } = await supabase.rpc('match_run_to_dungeon', {
    encoded_polyline: encodedPolyline,
    total_time_seconds: Math.max(0, Math.floor(totalTimeSeconds)),
  });

  if (error) {
    throw error;
  }

  await resetRecordingSession();

  return {
    encodedPolyline,
    matchedDungeonId: (data as string | null) ?? null,
  };
}
