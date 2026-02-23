-- Migration to sync showcase scores and add automatic tracking
-- This fixes the issue where profiles.showcase_score might be out of sync with showcase_votes

-- 1. Initial Sync: Recalculate all scores from existing votes
UPDATE public.profiles p
SET showcase_score = (
  SELECT COALESCE(SUM(vote_value), 0)
  FROM public.showcase_votes v
  WHERE v.target_id = p.id
);

-- 2. Create a function to keep showcase_score in sync automatically
CREATE OR REPLACE FUNCTION public.sync_showcase_score()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles
    SET showcase_score = COALESCE(showcase_score, 0) + NEW.vote_value
    WHERE id = NEW.target_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles
    SET showcase_score = COALESCE(showcase_score, 0) - OLD.vote_value
    WHERE id = OLD.target_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle case where target_id might change (rare but possible)
    IF (OLD.target_id = NEW.target_id) THEN
      UPDATE public.profiles
      SET showcase_score = COALESCE(showcase_score, 0) - OLD.vote_value + NEW.vote_value
      WHERE id = NEW.target_id;
    ELSE
      UPDATE public.profiles
      SET showcase_score = COALESCE(showcase_score, 0) - OLD.vote_value
      WHERE id = OLD.target_id;
      UPDATE public.profiles
      SET showcase_score = COALESCE(showcase_score, 0) + NEW.vote_value
      WHERE id = NEW.target_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS tr_sync_showcase_score ON public.showcase_votes;
CREATE TRIGGER tr_sync_showcase_score
AFTER INSERT OR UPDATE OR DELETE ON public.showcase_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_showcase_score();
