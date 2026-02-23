import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get current week in YYYY-Www format
function getCurrentWeek(): string {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  // Calculate week number
  const weekNum = Math.ceil((((now.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Helper to get days until Sunday (end of week)
function getDaysUntilWeekEnd(): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  // If today is Sunday (0), we want to show 0 days left (resets tonight)
  // If today is Monday (1), we want to show 6 days left.
  return (7 - dayOfWeek) % 7;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // 1. Fetch Hunters with Cosmetics JOIN
    const { data: hunters, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, hunter_name, avatar, level, exp, current_title, current_class, showcase_score, base_body_url, gender, status, referral_code, active_skin,
        cosmetics:user_cosmetics(id, equipped, shop_items(*))
      `)
      .eq('status', 'approved')      // Must be approved
      .eq('is_private', false)       // Must be public
      .eq('user_cosmetics.equipped', true) // Only get equipped gear
      .order('showcase_score', { ascending: false });

    if (error) throw error;

    // 2. Fetch ALL votes for the current week to calculate counts
    const currentPeriod = getCurrentWeek();
    const { data: allVotes } = await supabaseAdmin
      .from('showcase_votes')
      .select('target_id, vote_type')
      .eq('vote_month', currentPeriod);

    const voteCounts: Record<string, { resonance: number, interference: number }> = {};
    if (allVotes) {
      allVotes.forEach((v: any) => {
        if (!voteCounts[v.target_id]) {
          voteCounts[v.target_id] = { resonance: 0, interference: 0 };
        }
        if (v.vote_type === 'resonate') {
          voteCounts[v.target_id].resonance++;
        } else {
          voteCounts[v.target_id].interference++;
        }
      });
    }

    // 3. Fetch Votes to show if you already voted
    let userVotes: Record<string, string> = {};
    let userHasVoted = false;
    if (userId) {
      const { data: vData } = await supabaseAdmin
        .from('showcase_votes')
        .select('target_id, vote_type')
        .eq('voter_id', userId)
        .eq('vote_month', currentPeriod); // Use current week for vote status check

      if (vData && vData.length > 0) {
        userHasVoted = true;
        userVotes = vData.reduce((acc: Record<string, string>, v: any) => {
          acc[v.target_id] = v.vote_type;
          return acc;
        }, {});
      }
    }

    // 4. Format Data for Frontend
    const formattedHunters = (hunters || []).map((h: any) => ({
      ...h,
      name: h.hunter_name, // Map for UI
      resonance_count: voteCounts[h.id]?.resonance || 0,
      interference_count: voteCounts[h.id]?.interference || 0,
      userVote: userVotes[h.id] || null,
      cosmetics: h.cosmetics || []
    }));

    return NextResponse.json({
      hunters: formattedHunters,
      daysUntilReset: getDaysUntilWeekEnd(), // Changed to weekly reset
      userHasVoted
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const { targetId, voteType } = await request.json();
    const currentPeriod = getCurrentWeek(); // Using Week instead of Month

    if (!userId || userId === targetId) {
      return NextResponse.json({ error: '[SYSTEM] INVALID VOTE SOURCE' }, { status: 400 });
    }

    let newCoins = null;

    // 0. Check if user has ALREADY voted for ANYONE this week
    const { data: existingVoteThisWeek } = await supabaseAdmin
      .from('showcase_votes')
      .select('target_id')
      .eq('voter_id', userId)
      .eq('vote_month', currentPeriod)
      .maybeSingle();

    if (existingVoteThisWeek) {
      return NextResponse.json({ error: 'You have already cast your vote for this week.' }, { status: 400 });
    }

    // 1. Check if this user has EVER voted for this target (to handle gold reward)
    // We only reward gold for the first time they vote for a specific hunter in a specific week
    // Since we now block multiple votes per week, if they get here, they haven't voted this week.
    
    // Fetch user current coins to award reward
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();
    
    if (!profileError && userProfile) {
      newCoins = (userProfile.coins || 0) + 250;
      await supabaseAdmin
        .from('profiles')
        .update({ coins: newCoins })
        .eq('id', userId);
    }

    // 2. Record the vote using upsert on (voter_id, target_id)
    // We use upsert because the primary key is likely (voter_id, target_id)
    const { error: voteError } = await supabaseAdmin
      .from('showcase_votes')
      .upsert({
        voter_id: userId,
        target_id: targetId,
        vote_type: voteType,
        vote_value: voteType === 'resonate' ? 1.0 : -1.0,
        vote_month: currentPeriod
      }, { 
        onConflict: 'voter_id,target_id' 
      });

    if (voteError) throw voteError;

    // 2. Trigger the math engine (using the params we just verified in SQL)
    await supabaseAdmin.rpc('calculate_showcase_score', {
      hunter_id: targetId, 
      current_month: currentPeriod
    });

    return NextResponse.json({ success: true, newCoins });

  } catch (error: any) {
    console.error('🛑 VOTE SYSTEM FAILURE:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const { targetId } = await request.json();
    const currentPeriod = getCurrentWeek();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Remove the vote
    const { error: deleteError } = await supabaseAdmin
      .from('showcase_votes')
      .delete()
      .eq('voter_id', userId)
      .eq('target_id', targetId)
      .eq('vote_month', currentPeriod);

    if (deleteError) throw deleteError;

    // Recalculate the score after removing the vote
    await supabaseAdmin.rpc('calculate_showcase_score', {
      hunter_id: targetId,
      current_month: currentPeriod
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('🛑 VOTE REMOVAL FAILURE:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
