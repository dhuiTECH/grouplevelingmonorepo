-- Create memberships table for association applications
CREATE TABLE IF NOT EXISTS memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hunter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  association_id uuid NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at timestamp with time zone DEFAULT now(),
  decided_at timestamp with time zone,
  decided_by uuid REFERENCES profiles(id), -- Association leader who made the decision
  UNIQUE(hunter_id, association_id) -- Prevent duplicate applications
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_hunter ON memberships(hunter_id);
CREATE INDEX IF NOT EXISTS idx_memberships_association ON memberships(association_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_association_status ON memberships(association_id, status);

-- Function to increment association member count
CREATE OR REPLACE FUNCTION increment_member_count(association_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE associations
  SET member_count = member_count + 1, updated_at = now()
  WHERE id = association_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement association member count
CREATE OR REPLACE FUNCTION decrement_member_count(association_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE associations
  SET member_count = member_count - 1, updated_at = now()
  WHERE id = association_id AND member_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE memberships IS 'Association membership applications and status';
COMMENT ON COLUMN memberships.hunter_id IS 'Hunter applying to join';
COMMENT ON COLUMN memberships.association_id IS 'Association being applied to';
COMMENT ON COLUMN memberships.status IS 'Application status: pending, approved, rejected';
COMMENT ON COLUMN memberships.decided_by IS 'Association leader who approved/rejected the application';