-- Track in-progress onboarding sub-steps without inferring from hunter_name.
-- Values: basics (name/gender) -> avatar -> class -> done (onboarding_completed true)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step text;

UPDATE public.profiles
  SET onboarding_step = 'done'
  WHERE COALESCE(onboarding_completed, false) = true;

UPDATE public.profiles
  SET onboarding_step = 'basics'
  WHERE COALESCE(onboarding_completed, false) = false
    AND (onboarding_step IS NULL OR trim(onboarding_step) = '');

UPDATE public.profiles
  SET onboarding_step = 'basics'
  WHERE onboarding_step IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN onboarding_step SET DEFAULT 'basics';

ALTER TABLE public.profiles
  ALTER COLUMN onboarding_step SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_step_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_step_check
  CHECK (onboarding_step IN ('basics', 'avatar', 'class', 'done'));

-- New auth users: start at basics (anonymous or full signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  placeholder_name text;
  placeholder_email text;
BEGIN
  placeholder_name := 'Hunter-' || replace(left(NEW.id::text, 8), '-', '');
  placeholder_email := replace(NEW.id::text, '-', '') || '@placeholder.local';

  INSERT INTO public.profiles (id, hunter_name, email, updated_at, onboarding_step)
  VALUES (NEW.id, placeholder_name, placeholder_email, now(), 'basics')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
