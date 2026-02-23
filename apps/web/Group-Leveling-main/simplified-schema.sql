-- ============================================
-- DESTRUCTIVE RESET (DROP IF EXISTS)
-- ============================================
-- This will drop ALL existing tables, functions, and triggers
-- Run this to completely reset your database schema

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_level_rank ON public.profiles;
DROP TRIGGER IF EXISTS trigger_update_hunter_stats ON public.profiles;

-- Drop functions
DROP FUNCTION IF EXISTS update_hunter_stats();
DROP FUNCTION IF EXISTS update_level_and_rank();
DROP FUNCTION IF EXISTS calculate_rank(integer);
DROP FUNCTION IF EXISTS calculate_level(bigint);

-- Drop tables (drop children first, then parents to avoid foreign key errors)
DROP TABLE IF EXISTS public.user_cosmetics CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.dungeon_registrations CASCADE;
DROP TABLE IF EXISTS public.user_dungeons CASCADE;
DROP TABLE IF EXISTS public.dungeon_completions CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.shop_items CASCADE;
DROP TABLE IF EXISTS public.dungeons CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles: Main player table (replaces users + user_progress)
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  hunter_name text NOT NULL UNIQUE,
  email text UNIQUE,
  avatar text DEFAULT '/default-avatar.png',
  base_body_url text,
  gender text,
  current_class text DEFAULT 'None',
  rank_tier integer DEFAULT 0,
  current_title text DEFAULT 'Novice Hunter',
  next_advancement_attempt timestamp with time zone,
  str_stat integer DEFAULT 10,
  spd_stat integer DEFAULT 10,
  end_stat integer DEFAULT 10,
  int_stat integer DEFAULT 10,
  lck_stat integer DEFAULT 10,
  per_stat integer DEFAULT 10,
  wil_stat integer DEFAULT 10,
  current_hp integer DEFAULT 100,
  max_hp integer DEFAULT 100,
  current_mp integer DEFAULT 50,
  max_mp integer DEFAULT 50,
  unassigned_stat_points integer DEFAULT 5,
  exp bigint DEFAULT 0,
  coins bigint DEFAULT 0,
  level integer DEFAULT 1,
  hunter_rank text DEFAULT 'E' CHECK (hunter_rank IN ('E', 'D', 'C', 'B', 'A', 'S')),
  weekly_slots_used integer DEFAULT 0,
  last_reset timestamp with time zone DEFAULT now(),
  onboarding_completed boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Dungeons: Available locations/events
CREATE TABLE public.dungeons (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  type text,
  difficulty text NOT NULL,
  requirement text,
  xp_reward integer NOT NULL,
  coin_reward integer NOT NULL,
  loot_table text,
  status text NOT NULL DEFAULT 'active',
  boss text,
  scheduled_start timestamp with time zone,
  auto_start boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Dungeon Registrations: Links hunters to dungeons
CREATE TABLE public.dungeon_registrations (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  hunter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dungeon_id text NOT NULL REFERENCES public.dungeons(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'banned')),
  registered_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(hunter_id, dungeon_id)
);

-- Activities: User-submitted fitness activities
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  hunter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strava_activity_id bigint,
  name text,
  type text,
  distance numeric,
  moving_time integer,
  elapsed_time integer,
  total_elevation_gain numeric,
  start_date timestamp with time zone,
  average_speed numeric,
  max_speed numeric,
  average_cadence numeric,
  average_temp numeric,
  workout_type integer,
  claimed boolean DEFAULT false,
  xp_earned integer DEFAULT 0,
  coins_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Shop Items: Items available for purchase
CREATE TABLE public.shop_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  description text,
  price integer DEFAULT 0,
  image_url text,
  thumbnail_url text,
  layer_zone text,
  slot text CHECK (slot IN ('avatar', 'background', 'body', 'head', 'face', 'hands', 'feet', 'weapon', 'accessory', 'magic effects')),
  z_index integer DEFAULT 1,
  rarity text DEFAULT 'common',
  bonus_type text CHECK (bonus_type IN ('speed', 'endurance', 'defense', 'strength', 'intelligence', 'attack_damage', 'crit_percentage', 'crit_damage', 'xp_boost', 'coin_boost', 'str', 'spd', 'end', 'int', 'lck', 'per', 'wil')),
  bonus_value numeric,
  is_active boolean DEFAULT true,
  is_animated boolean DEFAULT false,
  gender jsonb DEFAULT '["unisex"]'
);

-- User Cosmetics: Items owned by users
CREATE TABLE public.user_cosmetics (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  hunter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  equipped boolean DEFAULT false,
  acquired_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- INDEXES for Performance
-- ============================================

CREATE INDEX idx_profiles_hunter_name ON public.profiles(hunter_name);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_activities_hunter_id ON public.activities(hunter_id);
CREATE INDEX idx_activities_claimed ON public.activities(claimed);
CREATE INDEX idx_activities_strava_id ON public.activities(strava_activity_id);
CREATE INDEX idx_dungeon_registrations_hunter ON public.dungeon_registrations(hunter_id);
CREATE INDEX idx_dungeon_registrations_dungeon ON public.dungeon_registrations(dungeon_id);
CREATE INDEX idx_dungeon_registrations_status ON public.dungeon_registrations(status);
CREATE INDEX idx_user_cosmetics_hunter ON public.user_cosmetics(hunter_id);
CREATE INDEX idx_user_cosmetics_equipped ON public.user_cosmetics(equipped);
CREATE INDEX idx_shop_items_slot ON public.shop_items(slot);
CREATE INDEX idx_shop_items_active ON public.shop_items(is_active);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate level from exp
CREATE OR REPLACE FUNCTION calculate_level(exp_value bigint)
RETURNS integer AS $$
BEGIN
  RETURN FLOOR(SQRT(exp_value / 100))::integer + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate rank from level
CREATE OR REPLACE FUNCTION calculate_rank(level_value integer)
RETURNS text AS $$
BEGIN
  IF level_value < 10 THEN RETURN 'E';
  ELSIF level_value < 25 THEN RETURN 'D';
  ELSIF level_value < 45 THEN RETURN 'C';
  ELSIF level_value < 70 THEN RETURN 'B';
  ELSIF level_value < 90 THEN RETURN 'A';
  ELSE RETURN 'S';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update level and rank when exp changes
CREATE OR REPLACE FUNCTION update_hunter_stats()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = calculate_level(NEW.exp);
  NEW.hunter_rank = calculate_rank(NEW.level);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_level_rank
  BEFORE UPDATE OF exp ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_stats();

-- ============================================
-- INITIAL DATA (Optional - can be removed)
-- ============================================

-- Example dungeon
INSERT INTO public.dungeons (id, name, type, difficulty, requirement, xp_reward, coin_reward, loot_table, status, boss)
VALUES (
  'weekly-meetup-1',
  'Weekly Trail Run',
  'Weekly Meetup',
  'Easy',
  'Complete any 5km run',
  100,
  50,
  'common',
  'active',
  'The Trail Master'
) ON CONFLICT (id) DO NOTHING;

-- Avatar Shop Items
INSERT INTO public.shop_items (name, description, price, image_url, slot, layer_zone, z_index, rarity, gender)
VALUES
  ('Male Hunter Avatar', 'Classic male hunter avatar', 500, '/NoobMan.png', 'avatar', 'base', 10, 'common', '["male"]'),
  ('Female Hunter Avatar', 'Elegant female hunter avatar', 500, '/NoobWoman.png', 'avatar', 'base', 10, 'common', '["female"]'),
  ('Non-binary Hunter Avatar', 'Inclusive hunter representation', 500, '/Noobnonbinary.png', 'avatar', 'base', 10, 'common', '["nonbinary"]'),
  ('Elite Male Hunter Avatar', 'Enhanced male hunter with premium effects', 2500, '/NoobMan.png', 'avatar', 'base', 10, 'epic', '["male"]'),
  ('Elite Female Hunter Avatar', 'Enhanced female hunter with premium effects', 2500, '/NoobWoman.png', 'avatar', 'base', 10, 'epic', '["female"]'),
  ('Elite Non-binary Hunter Avatar', 'Enhanced inclusive hunter with premium effects', 2500, '/Noobnonbinary.png', 'avatar', 'base', 10, 'epic', '["nonbinary"]')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  slot = EXCLUDED.slot,
  layer_zone = EXCLUDED.layer_zone,
  z_index = EXCLUDED.z_index,
  rarity = EXCLUDED.rarity,
  gender = EXCLUDED.gender;

-- Background Shop Items
INSERT INTO public.shop_items (name, description, price, slot, layer_zone, z_index, rarity, gender)
VALUES
  ('Premium Hunter Background', 'Enhanced visual background with cyberpunk effects', 1000, 'background', 'background', 0, 'rare', '["unisex"]'),
  ('Epic Hunter Background', 'Rare animated background with dynamic lighting', 2500, 'background', 'background', 0, 'epic', '["unisex"]')
ON CONFLICT (name) DO NOTHING;
