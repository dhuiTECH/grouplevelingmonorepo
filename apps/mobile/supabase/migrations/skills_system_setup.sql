-- Add skill_loadout to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skill_loadout text[] DEFAULT ARRAY[]::text[];

-- Create user_skills table to track unlocked skills and ranks
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  current_rank integer DEFAULT 1,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Enable RLS on user_skills
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Policies for user_skills
CREATE POLICY "Users can view their own skills"
  ON user_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
  ON user_skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills"
  ON user_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);
