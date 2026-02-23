-- Create community_feedback table for hunter suggestions
CREATE TABLE IF NOT EXISTS community_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hunter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  sanitized_content text, -- Content with profanity filtered
  net_score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  quarter text NOT NULL -- Format: 'YYYY-Q1', 'YYYY-Q2', etc. for quarterly resets
);

-- Create feedback_votes table for voting on feedback
CREATE TABLE IF NOT EXISTS feedback_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_id uuid NOT NULL REFERENCES community_feedback(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('resonate', 'interfere')),
  vote_value integer NOT NULL, -- +1 for resonate, -1 for interfere
  voted_at timestamp with time zone DEFAULT now(),
  vote_quarter text NOT NULL, -- Same quarter format as feedback
  UNIQUE(voter_id, feedback_id, vote_quarter) -- Prevent multiple votes per quarter
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_feedback_hunter ON community_feedback(hunter_id);
CREATE INDEX IF NOT EXISTS idx_community_feedback_created ON community_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_feedback_quarter ON community_feedback(quarter);
CREATE INDEX IF NOT EXISTS idx_community_feedback_score ON community_feedback(net_score DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_voter_quarter ON feedback_votes(voter_id, vote_quarter);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_feedback ON feedback_votes(feedback_id);

-- Function to get current quarter
CREATE OR REPLACE FUNCTION get_current_quarter()
RETURNS text AS $$
DECLARE
  current_month integer := EXTRACT(MONTH FROM now());
  current_year integer := EXTRACT(YEAR FROM now());
  quarter_num integer;
BEGIN
  quarter_num := CEIL(current_month::numeric / 3);
  RETURN current_year || '-Q' || quarter_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update feedback net score
CREATE OR REPLACE FUNCTION update_feedback_score(feedback_uuid uuid, current_quarter text)
RETURNS void AS $$
DECLARE
  total_score integer := 0;
BEGIN
  SELECT COALESCE(SUM(vote_value), 0)
  INTO total_score
  FROM feedback_votes
  WHERE feedback_id = feedback_uuid AND vote_quarter = current_quarter;

  UPDATE community_feedback
  SET net_score = total_score
  WHERE id = feedback_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to sanitize content (replace profanity with blocks)
CREATE OR REPLACE FUNCTION sanitize_content(input_text text)
RETURNS text AS $$
DECLARE
  profanity_list text[] := ARRAY['fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap'];
  result_text text := input_text;
  word text;
BEGIN
  FOREACH word IN ARRAY profanity_list LOOP
    result_text := regexp_replace(result_text, '\y' || word || '\y', '█', 'gi');
  END LOOP;
  RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically sanitize content on insert/update
CREATE OR REPLACE FUNCTION trigger_sanitize_feedback()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sanitized_content := sanitize_content(NEW.content);
  NEW.quarter := get_current_quarter();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sanitize_feedback
  BEFORE INSERT OR UPDATE ON community_feedback
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sanitize_feedback();

-- Add comment for documentation
COMMENT ON TABLE community_feedback IS 'Community feedback system for hunter suggestions';
COMMENT ON COLUMN community_feedback.net_score IS 'Calculated score from resonate (+) and interfere (-) votes';
COMMENT ON COLUMN community_feedback.quarter IS 'Quarter when feedback was submitted (YYYY-QN format)';