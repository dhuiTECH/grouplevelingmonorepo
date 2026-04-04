/**
 * Phase 2 run recording: SQLite + distance accumulation.
 *
 * - `foreground` — `watchPositionAsync` while the app is open (no background / Always permission).
 *   Default. Use to test leaderboards, upload, encounters without full background location setup.
 * - `background` — `startLocationUpdatesAsync` + TaskManager (production-style).
 *
 * Set `EXPO_PUBLIC_RUN_RECORDING_MODE=background` in `.env` (or EAS env) for production-style builds.
 * Omit or any other value → `foreground`.
 */
export type RunRecordingMode = 'foreground' | 'background';

export function getRunRecordingMode(): RunRecordingMode {
  const raw = process.env.EXPO_PUBLIC_RUN_RECORDING_MODE ?? '';
  const normalized = raw.toLowerCase().trim();
  return normalized === 'background' ? 'background' : 'foreground';
}
