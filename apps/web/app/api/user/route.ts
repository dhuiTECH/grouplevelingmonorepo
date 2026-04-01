import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  // Skip processing if Supabase is not configured (for build)
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured. Missing SUPABASE_SERVICE_ROLE_KEY?')
    return NextResponse.json({ 
      error: 'Not configured', 
      details: 'Supabase service role key is missing. Please add SUPABASE_SERVICE_ROLE_KEY to your environment variables.'
    }, { status: 500 })
  }

  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    const emailParam = request.nextUrl.searchParams.get('email')
    const nameParam = request.nextUrl.searchParams.get('name')

    // Login flow: allow unauthenticated lookup by email or name only, return minimal fields
    if ((!authUser || authError) && (emailParam || nameParam)) {
      let loginProfile: { id: string; hunter_name: string; email: string | null; gender: string | null; current_class: string | null } | null = null
      if (emailParam) {
        const { data } = await supabaseAdmin.from('profiles').select('id, hunter_name, email, gender, current_class').eq('email', emailParam).single()
        loginProfile = data
      }
      if (!loginProfile && nameParam) {
        const { data } = await supabaseAdmin.from('profiles').select('id, hunter_name, email, gender, current_class').eq('hunter_name', nameParam).single()
        loginProfile = data
      }
      if (!loginProfile) {
        return NextResponse.json({
          error: 'Profile not found',
          details: 'No hunter profile found. Please check your email or hunter name.',
          isNewUser: true
        }, { status: 404 })
      }
      return NextResponse.json({
        user: {
          id: loginProfile.id,
          hunter_name: loginProfile.hunter_name,
          name: loginProfile.hunter_name,
          email: loginProfile.email,
          gender: loginProfile.gender,
          current_class: loginProfile.current_class
        }
      })
    }

    // Authenticated: only return the authenticated user's profile (ignore id/name/email params)
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to view your profile.' }, { status: 401 })
    }

    const hunterId = authUser.id

    // Get profile data - all progress data is in profiles table now
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, hunter_name, email, avatar, base_body_url, base_body_silhouette_url, base_body_tint_hex, hair_tint_hex, gender, current_class, rank_tier, current_title, next_advancement_attempt, str_stat, spd_stat, end_stat, int_stat, lck_stat, per_stat, wil_stat, current_hp, max_hp, current_mp, max_mp, unassigned_stat_points, exp, coins, gems, level, hunter_rank, weekly_slots_used, last_reset, last_nutrition_reward_at, onboarding_completed, status, is_admin, created_at, referral_code, referral_used, active_skin, daily_completions, weekly_streak_count, manual_daily_completions, manual_weekly_streak, daily_steps, last_steps_reset_at, is_private, world_x, world_y, steps_banked')
      .eq('id', hunterId)
      .single()

    if (profileError || !profile) {
      console.log('❌ Profile lookup failed:', profileError?.message)
      return NextResponse.json({
        error: 'Profile not found',
        details: 'No hunter profile found. Please complete the awakening process first.',
        isNewUser: true
      }, { status: 404 })
    }

    console.log('✅ Found profile:', profile.hunter_name)

    // Get user cosmetics (using hunter_id)
    const { data: cosmetics, error: cosmeticsError } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        id,
        equipped,
        acquired_at,
        shop_items (
          id,
          name,
          description,
          image_url,
          slot,
          z_index,
          rarity,
          is_animated,
          animation_config,
          bonuses,
          scale,
          offset_x,
          offset_y,
          z_index
        )
      `)
      .eq('hunter_id', profile.id)

    // Get claimed activities count
    const { count: claimedActivities } = await supabaseAdmin
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('hunter_id', profile.id)
      .eq('claimed', true)

    // Level and rank are auto-calculated in the database, but we can also calculate here
    const level = profile.level || Math.floor(Math.sqrt(Number(profile.exp) / 100)) + 1
    const rank = profile.hunter_rank || getRank(level)

    return NextResponse.json({
      user: {
        id: profile.id,
        name: profile.hunter_name, // Map hunter_name to name for frontend compatibility
        hunter_name: profile.hunter_name,
        email: profile.email,
        avatar: profile.avatar,
        base_body_url: profile.base_body_url,
        base_body_silhouette_url: profile.base_body_silhouette_url ?? undefined,
        base_body_tint_hex: profile.base_body_tint_hex ?? undefined,
        hair_tint_hex: profile.hair_tint_hex ?? undefined,
        gender: profile.gender,
        current_class: profile.current_class,
        rank_tier: profile.rank_tier,
        current_title: profile.current_title,
        next_advancement_attempt: profile.next_advancement_attempt,
        str_stat: profile.str_stat,
        spd_stat: profile.spd_stat,
        end_stat: profile.end_stat,
        int_stat: profile.int_stat,
        lck_stat: profile.lck_stat,
        per_stat: profile.per_stat,
        wil_stat: profile.wil_stat,
        current_hp: profile.current_hp,
        max_hp: profile.max_hp,
        current_mp: profile.current_mp,
        max_mp: profile.max_mp,
        unassigned_stat_points: profile.unassigned_stat_points,
        exp: Number(profile.exp),
        coins: Number(profile.coins),
        gems: Number(profile.gems || 0),
        level,
        rank: profile.hunter_rank, // Map hunter_rank to rank for compatibility
        hunter_rank: profile.hunter_rank,
        weekly_slots_used: profile.weekly_slots_used,
        cosmetics: cosmetics || [],
        claimed_activities: claimedActivities || 0,
        onboarding_completed: profile.onboarding_completed || false,
        status: profile.status,
        is_admin: profile.is_admin,
        referral_code: profile.referral_code,
        referral_used: profile.referral_used,
        active_skin: profile.active_skin || 'default',
        daily_completions: profile.daily_completions || 0,
        weekly_streak_count: profile.weekly_streak_count || 0,
        manual_daily_completions: profile.manual_daily_completions || 0,
        manual_weekly_streak: profile.manual_weekly_streak || 0,
        last_reset: profile.last_reset,
        last_nutrition_reward_at: profile.last_nutrition_reward_at,
        is_private: profile.is_private,
        world_x: profile.world_x ?? 0,
        world_y: profile.world_y ?? 0,
        steps_banked: profile.steps_banked ?? 0
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  // Skip processing if Supabase is not configured (for build)
  if (!supabaseAdmin) {
    return NextResponse.json({ 
      error: 'Not configured', 
      details: 'Supabase service role key is missing.'
    }, { status: 500 })
  }

  try {
    // Require Supabase Auth - only allow updating the authenticated user's profile
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to update your profile.' }, { status: 401 })
    }

    const body = await request.json()
    const { id, hunter_name, name, email, base_body_url, gender, avatar, current_class, rank_tier, current_title, next_advancement_attempt, str_stat, spd_stat, end_stat, int_stat, lck_stat, per_stat, wil_stat, current_hp, max_hp, current_mp, max_mp, unassigned_stat_points, status, onboarding_completed, exp, coins, gems, deductCoins, deductGems, referral_code, referral_used, active_skin, daily_steps, last_nutrition_reward_at, is_private, world_x, world_y, steps_banked } = body

    // Only allow updating the authenticated user's profile
    const hunterId = authUser.id

    // Check if profile exists and get admin status and current coins/gems
    const { data: currentProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, coins, gems')
      .eq('id', hunterId)
      .single()

    if (profileCheckError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (is_private !== undefined) {
      updateData.is_private = is_private
    }

    // Support both 'name' and 'hunter_name' for compatibility
    if (hunter_name !== undefined) {
      updateData.hunter_name = hunter_name
    } else if (name !== undefined) {
      updateData.hunter_name = name
    }

    if (email !== undefined) {
      updateData.email = email
    }

    if (gender !== undefined) {
      updateData.gender = gender
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar
    }

    if (base_body_url !== undefined) {
      updateData.base_body_url = base_body_url
    }

    if (current_class !== undefined) {
      updateData.current_class = current_class
    }

    if (rank_tier !== undefined) {
      updateData.rank_tier = rank_tier
    }

    if (current_title !== undefined) {
      updateData.current_title = current_title
    }

    if (next_advancement_attempt !== undefined) {
      updateData.next_advancement_attempt = next_advancement_attempt
    }

    if (str_stat !== undefined) {
      updateData.str_stat = str_stat
    }

    if (spd_stat !== undefined) {
      updateData.spd_stat = spd_stat
    }

    if (end_stat !== undefined) {
      updateData.end_stat = end_stat
    }

    if (int_stat !== undefined) {
      updateData.int_stat = int_stat
    }

    if (lck_stat !== undefined) {
      updateData.lck_stat = lck_stat
    }

    if (per_stat !== undefined) {
      updateData.per_stat = per_stat
    }

    if (wil_stat !== undefined) {
      updateData.wil_stat = wil_stat
    }

    if (current_hp !== undefined) {
      updateData.current_hp = current_hp
    }

    if (max_hp !== undefined) {
      updateData.max_hp = max_hp
    }

    if (current_mp !== undefined) {
      updateData.current_mp = current_mp
    }

    if (max_mp !== undefined) {
      updateData.max_mp = max_mp
    }

    if (unassigned_stat_points !== undefined) {
      updateData.unassigned_stat_points = unassigned_stat_points
    }

    // Support updating exp/coins (xp is mapped to exp)
    if (exp !== undefined) {
      updateData.exp = BigInt(exp)
    }

    if (coins !== undefined) {
      updateData.coins = BigInt(coins)
    }

    if (gems !== undefined) {
      updateData.gems = BigInt(gems)
    }

    // Handle coin deduction (for purchases)
    if (deductCoins !== undefined && deductCoins > 0) {
      const currentCoins = Number(currentProfile.coins || 0)
      if (currentCoins < deductCoins) {
        return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
      }
      updateData.coins = BigInt(currentCoins - deductCoins)
    }

    // Handle gem deduction (for purchases)
    if (deductGems !== undefined && deductGems > 0) {
      const currentGems = Number(currentProfile.gems || 0)
      if (currentGems < deductGems) {
        return NextResponse.json({ error: 'Insufficient gems' }, { status: 400 })
      }
      updateData.gems = BigInt(currentGems - deductGems)
    }

    // Admin users can auto-approve themselves
    if (status !== undefined && currentProfile?.is_admin) {
      updateData.status = 'approved'
    } else if (status !== undefined && !currentProfile?.is_admin) {
      // Non-admin users cannot change their own status
      return NextResponse.json({ error: 'Cannot change status' }, { status: 403 })
    }

    if (onboarding_completed !== undefined) {
      updateData.onboarding_completed = onboarding_completed
    }

    if (referral_code !== undefined) {
      updateData.referral_code = referral_code
    }

    if (referral_used !== undefined) {
      updateData.referral_used = referral_used
    }

    if (active_skin !== undefined) {
      updateData.active_skin = active_skin
    }

    if (daily_steps !== undefined) {
      updateData.daily_steps = daily_steps
    }

    if (last_nutrition_reward_at !== undefined) {
      updateData.last_nutrition_reward_at = last_nutrition_reward_at
    }

    if (world_x !== undefined) {
      updateData.world_x = world_x
    }
    if (world_y !== undefined) {
      updateData.world_y = world_y
    }
    if (steps_banked !== undefined) {
      updateData.steps_banked = steps_banked
    }

    const { data: profile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', hunterId)
      .select('id, hunter_name, email, avatar, base_body_url, base_body_silhouette_url, base_body_tint_hex, hair_tint_hex, gender, current_class, rank_tier, current_title, next_advancement_attempt, str_stat, spd_stat, end_stat, int_stat, lck_stat, per_stat, wil_stat, current_hp, max_hp, current_mp, max_mp, unassigned_stat_points, exp, coins, gems, level, hunter_rank, status, is_admin, referral_code, referral_used, active_skin, daily_completions, weekly_streak_count, manual_daily_completions, manual_weekly_streak, daily_steps, last_reset, last_nutrition_reward_at, is_private, world_x, world_y, steps_banked')
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: profile.id,
        name: profile.hunter_name,
        hunter_name: profile.hunter_name,
        email: profile.email,
        avatar: profile.avatar,
        base_body_url: profile.base_body_url,
        base_body_silhouette_url: profile.base_body_silhouette_url ?? undefined,
        base_body_tint_hex: profile.base_body_tint_hex ?? undefined,
        hair_tint_hex: profile.hair_tint_hex ?? undefined,
        gender: profile.gender,
        current_class: profile.current_class,
        rank_tier: profile.rank_tier,
        current_title: profile.current_title,
        next_advancement_attempt: profile.next_advancement_attempt,
        str_stat: profile.str_stat,
        spd_stat: profile.spd_stat,
        end_stat: profile.end_stat,
        int_stat: profile.int_stat,
        lck_stat: profile.lck_stat,
        per_stat: profile.per_stat,
        wil_stat: profile.wil_stat,
        current_hp: profile.current_hp,
        max_hp: profile.max_hp,
        current_mp: profile.current_mp,
        max_mp: profile.max_mp,
        unassigned_stat_points: profile.unassigned_stat_points,
        exp: Number(profile.exp),
        coins: Number(profile.coins),
        gems: Number(profile.gems || 0),
        level: profile.level,
        rank: profile.hunter_rank,
        hunter_rank: profile.hunter_rank,
        status: profile.status,
        is_admin: profile.is_admin,
        referral_code: profile.referral_code,
        referral_used: profile.referral_used,
        active_skin: profile.active_skin || 'default',
        daily_completions: profile.daily_completions || 0,
        weekly_streak_count: profile.weekly_streak_count || 0,
        manual_daily_completions: profile.manual_daily_completions || 0,
        manual_weekly_streak: profile.manual_weekly_streak || 0,
        daily_steps: profile.daily_steps || 0,
        last_reset: profile.last_reset,
        last_nutrition_reward_at: profile.last_nutrition_reward_at,
        is_private: profile.is_private,
        world_x: profile.world_x ?? 0,
        world_y: profile.world_y ?? 0,
        steps_banked: profile.steps_banked ?? 0
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile data' }, { status: 500 })
  }
}

function getRank(level: number): string {
  if (level < 10) return 'E'
  if (level < 25) return 'D'
  if (level < 45) return 'C'
  if (level < 70) return 'B'
  if (level < 90) return 'A'
  return 'S'
}
