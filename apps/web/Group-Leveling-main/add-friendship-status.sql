-- Add status column to friendships table for pending/accepted requests
ALTER TABLE friendships ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Update existing friendships to be accepted (since they were automatically created before)
UPDATE friendships SET status = 'accepted' WHERE status IS NULL OR status = 'pending';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_users_status ON friendships(user_id_1, user_id_2, status);