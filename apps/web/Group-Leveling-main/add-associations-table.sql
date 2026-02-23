-- Create associations table for guilds/clans
CREATE TABLE IF NOT EXISTS associations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  emblem_url text,
  leader_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_count integer DEFAULT 1,
  level integer DEFAULT 1,
  exp bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add association_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS association_id uuid REFERENCES associations(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_associations_name ON associations(name);
CREATE INDEX IF NOT EXISTS idx_associations_leader ON associations(leader_id);
CREATE INDEX IF NOT EXISTS idx_profiles_association ON profiles(association_id);

-- Add comment for documentation
COMMENT ON TABLE associations IS 'Hunter associations/guilds/clans';
COMMENT ON COLUMN associations.leader_id IS 'Profile ID of the association leader';
COMMENT ON COLUMN profiles.association_id IS 'Association this hunter belongs to';