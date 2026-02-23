-- Showcase Voting System RPC
-- Handles voting and updating scores securely (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION vote_showcase_rpc(
  voter_id_param uuid,
  target_id_param uuid,
  vote_type_param text,
  vote_month_param text,
  vote_value_param integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_vote_id uuid;
  target_profile_score integer;
  voter_profile_coins integer;
  new_voter_coins integer;
BEGIN
  -- 1. Check for existing vote this month/week
  SELECT voter_id INTO existing_vote_id
  FROM public.showcase_votes
  WHERE voter_id = voter_id_param AND vote_month = vote_month_param
  LIMIT 1;

  IF existing_vote_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'You have already voted this week.');
  END IF;

  -- 2. Insert the vote
  -- (The tr_sync_showcase_score trigger will automatically update profiles.showcase_score)
  INSERT INTO public.showcase_votes (voter_id, target_id, vote_month, vote_type, vote_value)
  VALUES (voter_id_param, target_id_param, vote_month_param, vote_type_param, vote_value_param);

  -- 3. Award 250 coins to voter
  UPDATE public.profiles
  SET coins = COALESCE(coins, 0) + 250
  WHERE id = voter_id_param
  RETURNING coins INTO new_voter_coins;

  RETURN json_build_object(
    'success', true,
    'new_coins', new_voter_coins
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
