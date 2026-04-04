import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { getRecordingDb } from '@/lib/runRecordingDb';

/**
 * Single location sample: insert point + accumulate distance (same rules as the background location task).
 * Used by background TaskManager and foreground `watchPositionAsync`.
 */
export async function applyLocationSample(loc: Location.LocationObject): Promise<void> {
  const acc = loc.coords.accuracy;
  if (acc != null && acc > 50) return;

  const lat = loc.coords.latitude;
  const lng = loc.coords.longitude;
  const ts = Date.now();

  const db = await getRecordingDb();

  await db.runAsync(
    'INSERT INTO temp_coordinates (lat, lng, recorded_at) VALUES (?, ?, ?)',
    [lat, lng, ts]
  );

  const rows = await db.getAllAsync<{ lat: number; lng: number }>(
    'SELECT lat, lng FROM temp_coordinates ORDER BY id DESC LIMIT 2'
  );
  if (rows.length < 2) return;

  const prev = rows[1];
  const curr = rows[0];
  const delta = getDistance(
    { latitude: prev.lat, longitude: prev.lng },
    { latitude: curr.lat, longitude: curr.lng }
  );
  if (delta > 0 && delta < 30) {
    await db.runAsync('UPDATE recording_stats SET distance_meters = distance_meters + ? WHERE id = 1', [
      delta,
    ]);
  }
}
