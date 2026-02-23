-- Add pending_association_id to profiles table for membership applications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_association_id uuid REFERENCES associations(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_pending_association ON profiles(pending_association_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.pending_association_id IS 'Association the hunter has applied to join (pending approval)';