-- Add gems column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gems bigint DEFAULT 0;

-- Index for performance (optional but good practice)
-- CREATE INDEX IF NOT EXISTS idx_profiles_gems ON public.profiles(gems);
