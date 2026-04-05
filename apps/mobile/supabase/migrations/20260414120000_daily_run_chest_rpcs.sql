-- Daily run chest: one claim per UTC day + optional 500-coin wager flip (upgrade vs down to small)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_run_chest_date date;

COMMENT ON COLUMN public.profiles.last_run_chest_date IS 'UTC date when the hunter last claimed the daily run random-event chest (reserve_daily_run_chest).';

CREATE OR REPLACE FUNCTION public.reserve_daily_run_chest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (timezone('utc', now()))::date;
  existing date;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'not_authenticated');
  END IF;

  SELECT last_run_chest_date INTO existing
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'profile_not_found');
  END IF;

  IF existing = today THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  UPDATE public.profiles
  SET last_run_chest_date = today
  WHERE id = uid;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.wager_run_chest_flip(p_base_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cost bigint := 500;
  bal bigint;
  won boolean;
  final_tier text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_base_tier IS NULL OR p_base_tier NOT IN ('small', 'silver', 'medium', 'large') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tier');
  END IF;

  IF p_base_tier = 'large' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_max_tier');
  END IF;

  SELECT coins INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  IF bal < cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  END IF;

  won := random() < 0.5;

  IF won THEN
    final_tier := CASE p_base_tier
      WHEN 'small' THEN 'silver'
      WHEN 'silver' THEN 'medium'
      WHEN 'medium' THEN 'large'
      ELSE 'small'
    END;
  ELSE
    final_tier := 'small';
  END IF;

  UPDATE public.profiles
  SET coins = coins - cost
  WHERE id = uid AND coins >= cost;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'won', won,
    'final_chest_type', final_tier,
    'new_coins', (SELECT coins FROM public.profiles WHERE id = uid)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_daily_run_chest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wager_run_chest_flip(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_daily_run_chest() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wager_run_chest_flip(text) TO authenticated;
