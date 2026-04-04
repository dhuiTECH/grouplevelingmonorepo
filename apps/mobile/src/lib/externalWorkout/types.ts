export interface ExternalWorkoutRoute {
  /** Ordered path (WGS84). */
  points: { latitude: number; longitude: number }[];
  /** Wall-clock duration of the workout (seconds). */
  durationSeconds: number;
  /** Workout start (UTC). Required for dedupe in `finish_imported_run`. */
  startedAt: Date;
  /** Optional stable id from HealthKit / Google Fit for future stricter dedupe. */
  sourceId?: string;
}

export interface WorkoutSourceAdapter {
  readonly id: string;
  isAvailable(): Promise<boolean>;
  /** Future: list recent workouts for picker UI. */
  listWorkouts(): Promise<ExternalWorkoutRoute[]>;
}

export type FinishImportedRunResult =
  | { ok: true; kind: 'gate'; dungeon_id: string; distance_meters: number }
  | {
      ok: true;
      kind: 'free';
      free_hunt_id: string;
      distance_meters: number;
      xp_earned: number;
    }
  | { ok: false; reason: string };

export type ImportExternalWorkoutResult =
  | { kind: 'disabled' }
  | { kind: 'success'; result: FinishImportedRunResult }
  | { kind: 'error'; message: string };
