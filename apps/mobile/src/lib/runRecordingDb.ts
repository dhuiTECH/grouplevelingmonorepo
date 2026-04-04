import { openDatabaseAsync } from 'expo-sqlite';

export const RUN_RECORDING_DB_NAME = 'groupleveling-runs.db';

export type RecordingSqliteDb = Awaited<ReturnType<typeof openDatabaseAsync>>;

let dbPromise: Promise<RecordingSqliteDb> | null = null;

export async function getRecordingDb(): Promise<RecordingSqliteDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(RUN_RECORDING_DB_NAME);
      await ensureRecordingSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

export async function ensureRecordingSchema(db: RecordingSqliteDb): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS temp_coordinates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      recorded_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS recording_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      distance_meters REAL NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO recording_stats (id, distance_meters) VALUES (1, 0);
  `);
}

export async function resetRecordingSession(): Promise<void> {
  const db = await getRecordingDb();
  await db.execAsync('DELETE FROM temp_coordinates;');
  await db.runAsync('INSERT OR REPLACE INTO recording_stats (id, distance_meters) VALUES (1, 0);');
}

export async function getRecordingDistanceMeters(): Promise<number> {
  const db = await getRecordingDb();
  const row = await db.getFirstAsync<{ distance_meters: number }>(
    'SELECT distance_meters FROM recording_stats WHERE id = 1'
  );
  return row?.distance_meters ?? 0;
}

export async function getCoordinateRowCount(): Promise<number> {
  const db = await getRecordingDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM temp_coordinates'
  );
  return row?.c ?? 0;
}
