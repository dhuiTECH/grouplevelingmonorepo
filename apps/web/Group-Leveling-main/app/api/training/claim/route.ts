import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId: bodyUserId, pathName, xp, coins, gems, isQuestCompletion } = await request.json();
    const userId = bodyUserId || request.cookies.get('hunter_id')?.value || request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Check if this path was already rewarded today
    const { data: existingReward, error: checkError } = await supabaseAdmin
      .from('activities')
      .select('id')
      .eq('hunter_id', userId)
      .eq('name', 'Training Reward')
      .eq('type', pathName)
      .gte('created_at', today)
      .single();

    if (existingReward) {
      return NextResponse.json({ error: 'Reward already claimed for this path today' }, { status: 400 });
    }

    // 2. Check daily path limit (max 2 paths)
    const { count: pathsToday, error: countError } = await supabaseAdmin
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('hunter_id', userId)
      .eq('name', 'Training Reward')
      .gte('created_at', today);

    if ((pathsToday || 0) >= 2) {
      return NextResponse.json({ error: 'Daily reward limit reached (max 2 paths)' }, { status: 400 });
    }

    // 3. Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('exp, coins, gems, daily_completions')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 4. Update Profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        exp: (profile.exp || 0) + xp,
        coins: (profile.coins || 0) + coins,
        gems: (profile.gems || 0) + (gems || 0),
        daily_completions: isQuestCompletion ? 1 : (profile.daily_completions || 0)
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json({ error: 'Failed to update rewards' }, { status: 500 });
    }

    // 5. Record the reward in activities table
    const { error: activityError } = await supabaseAdmin
      .from('activities')
      .insert({
        hunter_id: userId,
        name: 'Training Reward',
        type: pathName,
        xp_earned: xp,
        coins_earned: coins,
        claimed: true,
        workout_type: 'Training Log'
      });

    if (activityError) {
      console.error('Failed to record activity:', activityError);
      // We don't return error here because the profile was already updated
    }

    return NextResponse.json({ 
      success: true, 
      newExp: (profile.exp || 0) + xp, 
      newCoins: (profile.coins || 0) + coins,
      newGems: (profile.gems || 0) + (gems || 0)
    });

  } catch (error) {
    console.error('Training claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
