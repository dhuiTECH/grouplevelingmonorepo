-- Add missing columns to dungeons table to support all required fields
ALTER TABLE public.dungeons 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS target_distance_meters integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS world_x integer,
ADD COLUMN IF NOT EXISTS world_y integer,
ADD COLUMN IF NOT EXISTS icon_url text;

-- Add comments for documentation
COMMENT ON COLUMN public.dungeons.image_url IS 'URL for the dungeon display image';
COMMENT ON COLUMN public.dungeons.target_distance_meters IS 'The target distance for the dungeon in meters (e.g., 20000 for 20km)';
COMMENT ON COLUMN public.dungeons.tier IS 'The tier of the dungeon (e.g., 20k, 5k)';
COMMENT ON COLUMN public.dungeons.description IS 'Detailed description of the dungeon challenges and lore';
COMMENT ON COLUMN public.dungeons.world_x IS 'X coordinate on the world map';
COMMENT ON COLUMN public.dungeons.world_y IS 'Y coordinate on the world map';
COMMENT ON COLUMN public.dungeons.icon_url IS 'URL for the map icon';

-- Update check constraint for dungeon type
ALTER TABLE public.dungeons DROP CONSTRAINT IF EXISTS check_dungeon_type;
ALTER TABLE public.dungeons ADD CONSTRAINT check_dungeon_type 
CHECK (type IN ('Weekly Meetup', 'Trail Meetup', 'Special Event', 'Challenge', 'Global Challenge'));

