-- Add Solo Leveling stat system columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_class text DEFAULT 'None',
ADD COLUMN IF NOT EXISTS rank_tier integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_title text DEFAULT 'Novice Hunter',
ADD COLUMN IF NOT EXISTS next_advancement_attempt timestamp with time zone,
ADD COLUMN IF NOT EXISTS str_stat integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS spd_stat integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS end_stat integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS int_stat integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS lck_stat integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS per_stat integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS wil_stat integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS current_hp integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_hp integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS current_mp integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_mp integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS unassigned_stat_points integer DEFAULT 5;