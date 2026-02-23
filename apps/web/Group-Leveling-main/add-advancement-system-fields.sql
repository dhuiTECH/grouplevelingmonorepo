-- Add Solo Leveling advancement system fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS base_body_url text,
ADD COLUMN IF NOT EXISTS current_class text DEFAULT 'None',
ADD COLUMN IF NOT EXISTS rank_tier integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_title text DEFAULT 'Hunter',
ADD COLUMN IF NOT EXISTS next_advancement_attempt timestamp with time zone;