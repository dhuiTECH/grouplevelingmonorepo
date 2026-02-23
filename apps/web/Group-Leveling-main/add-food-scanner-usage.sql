-- Table to track daily AI food scanner usage (limit 3 per user per day)
CREATE TABLE IF NOT EXISTS food_scanner_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_scanner_usage_hunter_used_at
  ON food_scanner_usage (hunter_id, used_at);

COMMENT ON TABLE food_scanner_usage IS 'One row per AI food scan; used to enforce 3 scans per user per day';
