-- Advancement system: add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_tier integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_advancement_attempt timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unassigned_stat_points integer DEFAULT 0;

-- RPC: handle class advancement attempts (server-side validation)
CREATE OR REPLACE FUNCTION attempt_advancement(
  user_id uuid,
  current_level int,
  new_title text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile public.profiles%rowtype;
  current_tier int;
  required_level int;
  is_success boolean;
  lockout_time timestamp with time zone;
BEGIN
  -- 1. Fetch current user data securely
  SELECT * INTO user_profile FROM public.profiles WHERE id = user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  current_tier := COALESCE(user_profile.rank_tier, 0);

  -- 2. Validate Requirements (Server-side check)
  -- Tier 0 -> 1 requires Level 30, Tier 1 -> 2 requires Level 60, Tier 2 -> 3 requires Level 90
  required_level := (current_tier + 1) * 30;
  IF user_profile.level < required_level THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient Level. You must be level ' || required_level);
  END IF;

  -- 3. Validate Lockout
  IF user_profile.next_advancement_attempt IS NOT NULL AND user_profile.next_advancement_attempt > now() THEN
    RETURN json_build_object('success', false, 'lockout', user_profile.next_advancement_attempt, 'message', 'Temple is sealed');
  END IF;

  -- 4. Calculate Success (e.g. 70% base chance)
  is_success := (random() < 0.70);

  IF is_success THEN
    -- SUCCESS: Update Tier, Title, Clear Lockout, grant stat points
    UPDATE public.profiles
    SET
      rank_tier = current_tier + 1,
      current_title = new_title,
      next_advancement_attempt = NULL,
      unassigned_stat_points = COALESCE(user_profile.unassigned_stat_points, 0) + 5
    WHERE id = user_id;
    RETURN json_build_object(
      'success', true,
      'new_tier', current_tier + 1,
      'new_title', new_title
    );
  ELSE
    -- FAILURE: Set 7-day Lockout
    lockout_time := now() + interval '7 days';
    UPDATE public.profiles
    SET next_advancement_attempt = lockout_time
    WHERE id = user_id;
    RETURN json_build_object(
      'success', false,
      'lockout', lockout_time,
      'message', 'The System rejects you.'
    );
  END IF;
END;
$$;
