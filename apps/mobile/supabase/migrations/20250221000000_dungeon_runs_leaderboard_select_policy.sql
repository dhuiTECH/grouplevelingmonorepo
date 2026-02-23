-- Allow all authenticated users to read all dungeon_runs so the best_dungeon_times
-- view (used by the leaderboard) can return everyone's best times.
CREATE POLICY "Leaderboard can read all runs"
  ON public.dungeon_runs
  FOR SELECT
  TO authenticated
  USING (true);
