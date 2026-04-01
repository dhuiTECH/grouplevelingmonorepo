-- Kudos (Strava-style) on completed dungeon runs; one per giver per run.
CREATE TABLE public.dungeon_run_kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dungeon_run_id uuid NOT NULL REFERENCES public.dungeon_runs(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dungeon_run_id, from_user_id)
);

CREATE INDEX idx_dungeon_run_kudos_run_id ON public.dungeon_run_kudos(dungeon_run_id);

ALTER TABLE public.dungeon_run_kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dungeon_run_kudos_select_authenticated"
  ON public.dungeon_run_kudos FOR SELECT
  TO authenticated
  USING (true);

-- Only give kudos on someone else's run (enforced in DB)
CREATE POLICY "dungeon_run_kudos_insert_for_others_only"
  ON public.dungeon_run_kudos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
    AND EXISTS (
      SELECT 1 FROM public.dungeon_runs dr
      WHERE dr.id = dungeon_run_id AND dr.user_id <> auth.uid()
    )
  );

CREATE POLICY "dungeon_run_kudos_delete_own"
  ON public.dungeon_run_kudos FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id);
