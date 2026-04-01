/** Matches `best_dungeon_times.leaderboard_score` in the DB (higher = better). */
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
