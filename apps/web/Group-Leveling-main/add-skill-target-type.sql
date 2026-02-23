-- Add targeting logic to skills table
-- This allows defining who a skill can be used on (Enemy, Self, Teammate, Area)

-- 1. Add target_type column
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'enemy';

-- 2. Add constraint to ensure valid values
ALTER TABLE public.skills 
DROP CONSTRAINT IF EXISTS valid_target_type;

ALTER TABLE public.skills 
ADD CONSTRAINT valid_target_type 
CHECK (target_type IN ('enemy', 'self', 'teammate', 'area_enemy', 'area_friendly'));

-- 3. Add comment for clarity
COMMENT ON COLUMN public.skills.target_type IS 'Defines valid targets: enemy (default), self, teammate, area_enemy, area_friendly';
