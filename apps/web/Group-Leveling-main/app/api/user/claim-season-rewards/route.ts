import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    // Require Supabase Auth - derive userId from authenticated user only
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to claim rewards.' }, { status: 401 });
    }

    const body = await req.json();
    const { gemsEarned, season } = body;

    if (!gemsEarned || !season) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Call the Secure RPC Function (userId from auth only)
    const { data, error } = await supabaseAdmin.rpc('claim_season_rewards', {
      p_user_id: authUser.id,
      p_gems: gemsEarned,
      p_season: season
    });

    if (error) throw error;

    // 3. Return the clean JSON object from the database
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Reward Claim Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
