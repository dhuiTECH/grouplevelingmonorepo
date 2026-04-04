import { getRecordingDb } from '@/lib/runRecordingDb';

export interface RecordingCoordinateRow {
  lat: number;
  lng: number;
}

/** Ordered GPS samples for the current recording session (from SQLite). */
export async function readRecordingPathCoordinates(): Promise<RecordingCoordinateRow[]> {
  const db = await getRecordingDb();
  const rows = await db.getAllAsync<RecordingCoordinateRow>(
    'SELECT lat, lng FROM temp_coordinates ORDER BY id ASC'
  );
  return rows ?? [];
}
