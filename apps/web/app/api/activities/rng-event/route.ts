import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const inParty = searchParams.get('in_party') === 'true';

    // 1. Fetch available random events (nodes with is_random_event = true)
    // We join with encounter_pool to get mob stats if it's a battle
    const { data: events, error: fetchError } = await supabaseAdmin
      .from('world_map_nodes')
      .select(`
        *,
        encounter:encounter_pool(*)
      `)
      .eq('is_random_event', true);

    if (fetchError) {
      console.error('Error fetching RNG events:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ event: null });
    }

    // 2. Simple weight-based selection (could be improved)
    // If in party, maybe we filter for better events or just increase odds of S-rank mobs
    // For now, just random pick
    const randomIndex = Math.floor(Math.random() * events.length);
    const selectedEvent = events[randomIndex];

    // 3. Optional: Loot bonus logic if in party
    if (inParty && selectedEvent.encounter) {
      // Modify encounter metadata for better loot
      const metadata = selectedEvent.encounter.metadata || {};
      const rewards = metadata.rewards || {};
      
      // Give a 20% bonus to coins and exp if in party
      if (rewards.coins) rewards.coins = Math.floor(rewards.coins * 1.2);
      if (rewards.exp) rewards.exp = Math.floor(rewards.exp * 1.2);
      
      selectedEvent.encounter.metadata = {
        ...metadata,
        rewards,
        party_bonus: true
      };
    }

    return NextResponse.json({ event: selectedEvent });

  } catch (error) {
    console.error('RNG Event Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
