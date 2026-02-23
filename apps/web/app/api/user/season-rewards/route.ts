import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    // --- Eligibility Logic ---
    const today = new Date();
    const isLastDayOfMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // For testing, we can temporarily bypass the date check
    const allowReward = true; // Set to true to test the modal

    if (!allowReward) {
      return NextResponse.json(null); // No reward available
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('association_id, last_season_claimed')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentSeason = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (userProfile.association_id && userProfile.last_season_claimed !== currentSeason) {
      const mockRewardData = {
        rank: 5,
        gemsEarned: 20,
        goldBuff: 5,
        expBuff: 10
      };
      return NextResponse.json(mockRewardData);
    }

    return NextResponse.json(null); // No reward available

  } catch (error: any) {
    console.error('Season Rewards Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
