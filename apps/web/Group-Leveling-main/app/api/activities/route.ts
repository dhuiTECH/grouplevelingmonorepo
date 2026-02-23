import { NextRequest, NextResponse } from 'next/server'
import strava from 'strava-v3'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/utils/supabase/server'
import { calculateLevel } from '@/lib/stats'

export async function GET(request: NextRequest) {
  // Skip processing if Supabase is not configured (for build)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ activities: [] }, { status: 200 })
  }

  // Require Supabase Auth - derive userId from authenticated user only
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser) {
    return NextResponse.json({ error: 'Not authenticated', details: 'Please log in to sync activities.' }, { status: 401 })
  }
  const userId = authUser.id

  try {
    // Get user with Strava tokens
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user.strava_access_token) {
      return NextResponse.json({ error: 'Strava not connected' }, { status: 400 })
    }

    // Check if token is expired and refresh if needed
    let accessToken = user.strava_access_token
    if (user.strava_token_expires && user.strava_token_expires * 1000 < Date.now()) {
      try {
        // For now, skip token refresh and return an error
        // Token refresh requires proper OAuth setup
        console.warn('Strava token expired, refresh needed but not implemented')
        return NextResponse.json({ error: 'Strava token expired, please reconnect' }, { status: 401 })
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError)
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })
      }
    }

    // Configure Strava client with valid token
    strava.config({
      access_token: accessToken,
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      redirect_uri: `${request.nextUrl.origin}/api/auth/strava`
    } as any)

    // Get recent activities
    const activities = await (strava as any).athletes.listActivities({
      page: 1,
      per_page: 30
    })

    // Process and store activities
    const processedActivities = activities.map((activity: any) => ({
      strava_activity_id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: activity.distance / 1000, // Convert to km
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      start_date: activity.start_date,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_cadence: activity.average_cadence,
      average_temp: activity.average_temp,
      workout_type: activity.workout_type
    }))

    // Store activities in database (upsert to avoid duplicates)
    for (const activity of processedActivities) {
      const { error } = await supabaseAdmin
        .from('activities')
        .upsert({
          hunter_id: userId,
          ...activity,
          claimed: false,
          exp_earned: calculateXP(activity),
          coins_earned: calculateCoins(activity)
        }, {
          onConflict: 'hunter_id,strava_activity_id'
        })

      if (error) {
        console.error('Activity upsert error:', error)
      }
    }

    return NextResponse.json({ activities: processedActivities })
  } catch (error) {
    console.error('Activities fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

// Calculate XP based on activity
function calculateXP(activity: any): number {
  const baseXP = activity.distance * 100 // 100 XP per km
  const elevationBonus = activity.total_elevation_gain * 10 // 10 XP per meter elevation
  const speedBonus = activity.average_speed > 5 ? 50 : 0 // Speed bonus for faster runs
  return Math.floor(baseXP + elevationBonus + speedBonus)
}

// Calculate coins based on activity with coin boost bonus
function calculateCoins(activity: any, coinBoostPercent: number = 0): number {
  const baseCoins = Math.floor(activity.distance * 10) // 10 coins per km
  const elevationBonus = Math.floor(activity.total_elevation_gain / 10) // 1 coin per 10m elevation

  let totalCoins = baseCoins + elevationBonus;

  // Apply coin boost bonus
  if (coinBoostPercent > 0) {
    totalCoins = totalCoins * (1 + coinBoostPercent / 100);
  }

  return Math.floor(totalCoins);
}

export async function POST(request: NextRequest) {
  // Require Supabase Auth - derive userId from authenticated user only
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser) {
    return NextResponse.json({ error: 'Not authenticated', details: 'Please log in to claim activities.' }, { status: 401 })
  }
  const userId = authUser.id

  try {
    const { activityId } = await request.json()

    // Check if supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get user profile (using profiles table as source of truth)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, exp, coins, weekly_slots_used, unassigned_stat_points, skill_points, level, lck_stat')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check weekly slots
    if ((profile.weekly_slots_used || 0) >= 3) {
      return NextResponse.json({ error: 'Weekly slots exhausted' }, { status: 400 })
    }

    // Get activity
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .eq('hunter_id', userId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (activity.claimed) {
      return NextResponse.json({ error: 'Activity already claimed' }, { status: 400 })
    }

    // Calculate Luck Bonus
    const luckStat = profile.lck_stat || 10;
    const luckCoinBonus = ((luckStat - 10) * 0.001); // 0.1% gold bonus per point above 10

    // Get user's equipped items and calculate coin boost bonus
    const { data: userCosmetics } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        equipped,
        shop_items (
          bonuses
        )
      `)
      .eq('hunter_id', userId)
      .eq('equipped', true);

    let coinBoostPercent = 0;
    if (userCosmetics) {
      userCosmetics.forEach((cosmetic: any) => {
        if (cosmetic.shop_items?.bonuses && Array.isArray(cosmetic.shop_items.bonuses)) {
          cosmetic.shop_items.bonuses.forEach((bonus: any) => {
            if (bonus.type === 'coin_boost' && bonus.value) {
              coinBoostPercent += bonus.value;
            }
          });
        }
      });
    }

    // Add luck bonus to coin boost
    coinBoostPercent += luckCoinBonus;

    // Recalculate coins with all bonuses applied
    const recalculatedCoins = calculateCoins(activity, coinBoostPercent);

    // LEVEL UP LOGIC
    const currentExp = Number(profile.exp || 0);
    const newExp = currentExp + activity.exp_earned;
    
    // Calculate levels
    // Use stored level if available, otherwise calculate from current XP
    const currentLevel = profile.level || calculateLevel(currentExp);
    const newLevel = calculateLevel(newExp);
    const levelsGained = Math.max(0, newLevel - currentLevel);

    let statPointsToAdd = 0;
    let skillPointsToAdd = 0;

    if (levelsGained > 0) {
      // Award 5 Stat Points & 1 Skill Point per level gained
      statPointsToAdd = levelsGained * 5;
      skillPointsToAdd = levelsGained * 1;
      console.log(`🆙 LEVEL UP! User ${userId} gained ${levelsGained} levels. +${statPointsToAdd} Stats, +${skillPointsToAdd} Skills.`);
    }

    // Update activity as claimed
    const { error: updateActivityError } = await supabaseAdmin
      .from('activities')
      .update({ claimed: true })
      .eq('id', activityId)

    if (updateActivityError) {
      return NextResponse.json({ error: 'Failed to claim activity' }, { status: 500 })
    }

    // Update user profile with new stats
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        exp: newExp,
        level: newLevel,
        coins: Number(profile.coins || 0) + recalculatedCoins,
        weekly_slots_used: (profile.weekly_slots_used || 0) + 1,
        unassigned_stat_points: (profile.unassigned_stat_points || 0) + statPointsToAdd,
        skill_points: (profile.skill_points || 0) + skillPointsToAdd
      })
      .eq('id', profile.id)

    if (updateProfileError) {
      console.error('Profile update error:', updateProfileError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      exp_earned: activity.exp_earned,
      coins_earned: recalculatedCoins,
      levels_gained: levelsGained,
      new_level: newLevel
    })
  } catch (error) {
    console.error('Activity claim error:', error)
    return NextResponse.json({ error: 'Failed to claim activity' }, { status: 500 })
  }
}
