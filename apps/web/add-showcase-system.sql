-- Create showcase_votes table for monthly hunter voting system
CREATE TABLE IF NOT EXISTS showcase_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('resonate', 'interfere')),
  vote_value numeric NOT NULL, -- +1.0 for resonate, -1.0 for interfere
  voted_at timestamp with time zone DEFAULT now(),
  vote_month text NOT NULL, -- Format: 'YYYY-MM' for monthly resets
  UNIQUE(voter_id, target_id, vote_month) -- Prevent multiple votes per month
);

-- Add showcase_score to profiles table (calculated field, but stored for performance)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS showcase_score numeric DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_showcase_votes_voter_month ON showcase_votes(voter_id, vote_month);
CREATE INDEX IF NOT EXISTS idx_showcase_votes_target_month ON showcase_votes(target_id, vote_month);
CREATE INDEX IF NOT EXISTS idx_showcase_votes_month ON showcase_votes(vote_month);
CREATE INDEX IF NOT EXISTS idx_profiles_showcase_score ON profiles(showcase_score);

-- Function to calculate showcase score for a hunter
CREATE OR REPLACE FUNCTION calculate_showcase_score(hunter_id uuid, current_month text)
RETURNS numeric AS $$
DECLARE
  total_score numeric := 0;
BEGIN
  SELECT COALESCE(SUM(vote_value), 0)
  INTO total_score
  FROM showcase_votes
  WHERE target_id = hunter_id AND vote_month = current_month;

  -- Update the profile's showcase_score
  UPDATE profiles SET showcase_score = total_score WHERE id = hunter_id;

  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate all showcase scores for current month
CREATE OR REPLACE FUNCTION recalculate_all_showcase_scores(current_month text)
RETURNS void AS $$
BEGIN
  -- Reset all showcase scores
  UPDATE profiles SET showcase_score = 0;

  -- Recalculate based on votes
  UPDATE profiles
  SET showcase_score = COALESCE(calculated_scores.total_score, 0)
  FROM (
    SELECT target_id, SUM(vote_value) as total_score
    FROM showcase_votes
    WHERE vote_month = current_month
    GROUP BY target_id
  ) calculated_scores
  WHERE profiles.id = calculated_scores.target_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE showcase_votes IS 'Monthly voting system for Style Monarch showcase';
COMMENT ON COLUMN showcase_votes.vote_month IS 'YYYY-MM format for monthly resets';
COMMENT ON COLUMN profiles.showcase_score IS 'Calculated monthly showcase score';