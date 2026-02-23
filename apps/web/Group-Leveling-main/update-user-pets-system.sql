-- Update user_pets table for enhanced pet system
ALTER TABLE public.user_pets 
ADD COLUMN IF NOT EXISTS experience INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment for the mobile client:
-- current_skills: Array of skill IDs the pet is currently using in battle.
-- metadata: Can store custom data like happiness, hunger, or specific quest flags.
