-- Extend quest_type to allow: weekly, story, side, slayer, boss, event
-- (Original: world, daily, class, hidden)
ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_quest_type_check;
ALTER TABLE public.quests ADD CONSTRAINT quests_quest_type_check CHECK (
  quest_type IN ('world', 'daily', 'weekly', 'story', 'side', 'slayer', 'boss', 'class', 'event', 'hidden')
);

-- requirements jsonb already supports enemy_id, kill_count, min_level; no schema change needed.
