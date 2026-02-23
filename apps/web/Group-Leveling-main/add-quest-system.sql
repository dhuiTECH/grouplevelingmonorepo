-- Quests Table
CREATE TABLE IF NOT EXISTS public.quests (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  description text,
  quest_type text DEFAULT 'world' CHECK (quest_type IN ('world', 'daily', 'class', 'hidden')),
  requirements jsonb DEFAULT '{}'::jsonb, -- e.g. {"level": 5, "stat": {"str": 10}}
  rewards jsonb DEFAULT '{}'::jsonb,      -- e.g. {"exp": 100, "coins": 50, "items": ["item-id"]}
  node_id uuid REFERENCES public.world_map_nodes(id) ON DELETE SET NULL, -- Optional: specific node where quest is picked up
  created_at timestamp with time zone DEFAULT now()
);

-- User Quests Tracking Table
CREATE TABLE IF NOT EXISTS public.user_quests (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  progress jsonb DEFAULT '{}'::jsonb, -- Track progress (e.g., {"current_steps": 500, "target_steps": 1000})
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(user_id, quest_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON public.user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON public.user_quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_node_id ON public.quests(node_id);

-- Add some mock quests
-- Note: node_id will be NULL if we don't have the specific IDs yet.
-- In a real scenario, you'd find the node IDs first.
-- For now, we'll just add them and you can link them in the admin panel.

INSERT INTO public.quests (title, description, quest_type, rewards)
VALUES 
('The Path of the Hunter', 'Complete your first training session and bank 5000 steps.', 'world', '{"exp": 500, "coins": 200}'),
('Seoul Explorer', 'Visit 3 different locations in Seoul.', 'world', '{"exp": 300, "coins": 100}'),
('Daily Grind', 'Bank 1000 steps today.', 'daily', '{"exp": 100, "coins": 50}');
