-- Server-side HP/MP regeneration system
-- This allows regeneration to continue even when users are not logged in

-- Function to calculate max HP
CREATE OR REPLACE FUNCTION calculate_max_hp(
  user_level INTEGER,
  end_stat INTEGER,
  wil_stat INTEGER,
  user_class TEXT
) RETURNS INTEGER AS $$
DECLARE
  base_hp INTEGER := 100 + (user_level * 10);
  end_multiplier INTEGER := CASE WHEN user_class = 'Tanker' THEN 10 ELSE 5 END;
  vitality_bonus INTEGER := wil_stat - 10;
BEGIN
  RETURN base_hp + (end_stat * end_multiplier) + vitality_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate max MP
CREATE OR REPLACE FUNCTION calculate_max_mp(int_stat INTEGER) RETURNS INTEGER AS $$
BEGIN
  RETURN 50 + (int_stat * 10);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate HP regeneration per minute
CREATE OR REPLACE FUNCTION calculate_hp_regen_rate(wil_stat INTEGER) RETURNS NUMERIC AS $$
BEGIN
  RETURN 0.5 + ((wil_stat - 10) * 0.25);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate MP regeneration per minute
CREATE OR REPLACE FUNCTION calculate_mp_regen_rate(wil_stat INTEGER) RETURNS NUMERIC AS $$
BEGIN
  RETURN 0.3 + ((wil_stat - 10) * 0.125);
END;
$$ LANGUAGE plpgsql;

-- Main regeneration function - regenerates HP/MP for all users
CREATE OR REPLACE FUNCTION regenerate_all_hp_mp() RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  max_hp_val INTEGER;
  max_mp_val INTEGER;
  hp_regen_val NUMERIC;
  mp_regen_val NUMERIC;
  new_hp INTEGER;
  new_mp INTEGER;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through all profiles that need regeneration
  FOR user_record IN
    SELECT id, level, end_stat, int_stat, wil_stat, current_class, current_hp, current_mp
    FROM profiles
    WHERE current_hp < calculate_max_hp(level, end_stat, wil_stat, current_class)
       OR current_mp < calculate_max_mp(int_stat)
  LOOP
    -- Calculate max values
    max_hp_val := calculate_max_hp(user_record.level, user_record.end_stat, user_record.wil_stat, user_record.current_class);
    max_mp_val := calculate_max_mp(user_record.int_stat);

    -- Calculate regeneration rates (per minute)
    hp_regen_val := calculate_hp_regen_rate(user_record.wil_stat);
    mp_regen_val := calculate_mp_regen_rate(user_record.wil_stat);

    -- Calculate new HP/MP (don't exceed max)
    new_hp := LEAST(user_record.current_hp + hp_regen_val, max_hp_val);
    new_mp := LEAST(user_record.current_mp + mp_regen_val, max_mp_val);

    -- Update the profile
    UPDATE profiles
    SET
      current_hp = new_hp,
      current_mp = new_mp,
      updated_at = NOW()
    WHERE id = user_record.id;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to regenerate HP/MP for a specific user
CREATE OR REPLACE FUNCTION regenerate_user_hp_mp(user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  max_hp_val INTEGER;
  max_mp_val INTEGER;
  hp_regen_val NUMERIC;
  mp_regen_val NUMERIC;
  new_hp INTEGER;
  new_mp INTEGER;
BEGIN
  -- Get user data
  SELECT level, end_stat, int_stat, wil_stat, current_class, current_hp, current_mp
  INTO user_record
  FROM profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculate max values
  max_hp_val := calculate_max_hp(user_record.level, user_record.end_stat, user_record.wil_stat, user_record.current_class);
  max_mp_val := calculate_max_mp(user_record.int_stat);

  -- Calculate regeneration rates (per minute)
  hp_regen_val := calculate_hp_regen_rate(user_record.wil_stat);
  mp_regen_val := calculate_mp_regen_rate(user_record.wil_stat);

  -- Calculate new HP/MP (don't exceed max)
  new_hp := LEAST(user_record.current_hp + hp_regen_val, max_hp_val);
  new_mp := LEAST(user_record.current_mp + mp_regen_val, max_mp_val);

  -- Update the profile
  UPDATE profiles
  SET
    current_hp = new_hp,
    current_mp = new_mp,
    updated_at = NOW()
  WHERE id = user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;