-- ============================================================
-- ADD UNIQUE CONSTRAINTS FOR USER DUPLICATE PREVENTION
-- ============================================================
-- This ensures no duplicate users can be created based on:
-- - name (hunter name must be unique)
-- - email (email must be unique)
-- - strava_id (Strava account must be unique)
-- - auth_user_id (already unique, but ensuring FK constraint)
-- ============================================================

-- STEP 1: Check for existing duplicates before adding constraints
-- Run these queries first to see if you have any duplicates:

-- SELECT name, COUNT(*) as count 
-- FROM public.users 
-- WHERE name IS NOT NULL 
-- GROUP BY name 
-- HAVING COUNT(*) > 1;

-- SELECT email, COUNT(*) as count 
-- FROM public.users 
-- WHERE email IS NOT NULL 
-- GROUP BY email 
-- HAVING COUNT(*) > 1;

-- SELECT strava_id, COUNT(*) as count 
-- FROM public.users 
-- WHERE strava_id IS NOT NULL 
-- GROUP BY strava_id 
-- HAVING COUNT(*) > 1;

-- STEP 2: Add unique constraints
-- Note: These will fail if duplicates exist. Clean them up first if needed.

-- Ensure name is unique (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_name_key' 
    AND table_name = 'users'
  ) THEN
    -- Only add if no duplicates exist
    ALTER TABLE public.users 
    ADD CONSTRAINT users_name_key UNIQUE (name);
    RAISE NOTICE 'Unique constraint added on name';
  ELSE
    RAISE NOTICE 'Unique constraint on name already exists';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Cannot add unique constraint - duplicate names exist. Clean them up first.';
END $$;

-- Ensure email is unique (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_email_key' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_email_key UNIQUE (email);
    RAISE NOTICE 'Unique constraint added on email';
  ELSE
    RAISE NOTICE 'Unique constraint on email already exists';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Cannot add unique constraint - duplicate emails exist. Clean them up first.';
END $$;

-- Ensure strava_id is unique (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_strava_id_key' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_strava_id_key UNIQUE (strava_id);
    RAISE NOTICE 'Unique constraint added on strava_id';
  ELSE
    RAISE NOTICE 'Unique constraint on strava_id already exists';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Cannot add unique constraint - duplicate strava_ids exist. Clean them up first.';
END $$;

-- Ensure auth_user_id is unique (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_auth_user_id_key' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
    RAISE NOTICE 'Unique constraint added on auth_user_id';
  ELSE
    RAISE NOTICE 'Unique constraint on auth_user_id already exists';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Cannot add unique constraint - duplicate auth_user_ids exist. Clean them up first.';
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- After running, verify constraints exist:
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'users' 
-- AND constraint_type = 'UNIQUE';
-- ============================================================


