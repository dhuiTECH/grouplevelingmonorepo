/**
 * Free-roam / free_hunt XP. Must stay in sync with `finish_imported_run` RPC (`meters_per_xp` in SQL).
 */
export const FREE_ROAM_METERS_PER_XP = 25;

export function freeRoamXpFromDistanceMeters(distanceMeters: number): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0;
  return Math.max(0, Math.floor(distanceMeters / FREE_ROAM_METERS_PER_XP));
}
