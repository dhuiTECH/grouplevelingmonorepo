-- Migration to update profiles table for Supabase Auth integration
-- This ensures profiles use Supabase Auth user IDs as primary keys

-- First, backup existing profiles data (if any)
CREATE TABLE IF NOT EXISTS profiles_backup AS
SELECT * FROM profiles;

-- Drop existing foreign key constraints if they exist
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Change the id column to use uuid type and reference auth.users
ALTER TABLE profiles ALTER COLUMN id TYPE uuid USING gen_random_uuid();
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add foreign key constraint to auth.users
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set id as primary key
ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

-- Update any existing profiles to use proper UUIDs
-- Note: This is a simplified migration. In production, you might need
-- to handle existing data more carefully, possibly by creating new
-- auth users for existing profiles.

-- Ensure email column is properly indexed for auth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Ensure hunter_name is unique (for duplicate prevention)
ALTER TABLE profiles ADD CONSTRAINT profiles_hunter_name_unique UNIQUE (hunter_name);

-- Update the status for existing profiles (if any) to 'active'
UPDATE profiles SET status = 'active' WHERE status IS NULL OR status = 'pending';

-- Add comment to document the schema
COMMENT ON TABLE profiles IS 'Hunter profiles linked to Supabase Auth users';
COMMENT ON COLUMN profiles.id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN profiles.hunter_name IS 'Unique hunter character name';
COMMENT ON COLUMN profiles.email IS 'User email address (also stored in auth.users)';
COMMENT ON COLUMN profiles.status IS 'Account status: active, pending, suspended';