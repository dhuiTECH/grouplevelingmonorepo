-- Add referral_code and active_skin columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_skin text DEFAULT 'default';

-- Update existing users with a default referral code if needed
-- This is a simple generator based on hunter_name or ID
UPDATE public.profiles 
SET referral_code = 'HUNT-' || UPPER(LEFT(hunter_name, 3)) || LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0')
WHERE referral_code IS NULL;
