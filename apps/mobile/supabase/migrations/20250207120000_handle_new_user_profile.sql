-- Ensure a profile row exists when a new user signs up (auth.users).
-- profiles requires hunter_name NOT NULL and email UNIQUE; we insert placeholders
-- so the app can then UPDATE with real name/email during signup.
-- Use a unique placeholder email per user to avoid UNIQUE(email) violation on retries.

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

  INSERT INTO public.profiles (id, hunter_name, email, updated_at)
  VALUES (NEW.id, placeholder_name, placeholder_email, now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop if exists to make migration idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
