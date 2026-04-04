/**
 * Matches `best_dungeon_times.leaderboard_score` (higher = better).
 * Global gates use `best_global_dungeon_times`: pace-based score (100000 / sec per km).
 */
export const DUNGEON_RUN_ELEVATION_SCORE_PER_METER = 10;
export const DUNGEON_RUN_TIME_SCORE_NUMERATOR = 100_000;

export function computeDungeonRunLeaderboardScore(
  elevationGainMeters: number,
  timeToTargetSeconds: number
): number {
  const elev = Math.max(0, elevationGainMeters);
  const t = Math.max(1, Math.round(timeToTargetSeconds));
  return elev * DUNGEON_RUN_ELEVATION_SCORE_PER_METER + DUNGEON_RUN_TIME_SCORE_NUMERATOR / t;
}
