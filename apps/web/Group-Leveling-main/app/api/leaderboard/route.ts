import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Query profiles table directly
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        hunter_name,
        avatar,
        base_body_url,
        current_class,
        rank_tier,
        current_title,
        next_advancement_attempt,
        str_stat,
        spd_stat,
        end_stat,
        int_stat,
        lck_stat,
        per_stat,
        wil_stat,
        current_hp,
        max_hp,
        current_mp,
        max_mp,
        unassigned_stat_points,
        exp,
        level,
        hunter_rank,
        coins,
        is_admin,
        referral_code,
        active_skin
      `)
      .eq('status', 'approved')
      .neq('hunter_name', 'damonhui')
      .order('exp', { ascending: false })
      .limit(10)

    if (profilesError) {
      console.error('❌ Failed to fetch profiles:', profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ leaderboard: [] })
    }

    // Fetch cosmetics for all users in parallel
    const cosmeticsPromises = profiles.map(async (profile: any) => {
      const { data: cosmetics, error: cosmeticsError } = await supabaseAdmin
        .from('user_cosmetics')
        .select(`
          id,
          equipped,
          acquired_at,
          shop_items!shop_item_id (
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
            offset_y
          )
        `)
        .eq('hunter_id', profile.id)
        .eq('equipped', true)

      if (cosmeticsError) {
        console.error(`❌ Failed to fetch cosmetics for profile ${profile.id}:`, cosmeticsError)
      }

      return { profileId: profile.id, cosmetics: cosmetics || [] }
    })

    const cosmeticsResults = await Promise.all(cosmeticsPromises)
    const cosmeticsMap = new Map(cosmeticsResults.map(r => [r.profileId, r.cosmetics]))

    // Helper function to calculate rank
    const getRank = (level: number): string => {
      if (level >= 120) return 'S'
      if (level >= 90) return 'A'
      if (level >= 60) return 'B'
      if (level >= 30) return 'C'
      return 'D'
    }

    // Transform data to match expected format with cosmetics
    const transformedData = profiles.map((profile: any) => {
      // Calculate combat power from equipped items
      const equippedItems = (cosmeticsMap.get(profile.id) || []).filter((c: any) => c.equipped)
      const combatPower = equippedItems.reduce((total: number, cosmetic: any) => {
        // Handle new bonuses array format
        if (cosmetic.shop_items?.bonuses && Array.isArray(cosmetic.shop_items.bonuses)) {
          const itemPower = cosmetic.shop_items.bonuses.reduce((sum: number, bonus: any) => {
            return sum + (bonus.value || 0)
          }, 0)
          return total + itemPower
        }
        // Fallback to old single bonus format for backward compatibility
        else if (cosmetic.shop_items?.bonus_value) {
          return total + cosmetic.shop_items.bonus_value
        }
        return total
      }, 0)

      // Calculate prestige score: 60% EXP + 40% Gold
      const prestigeScore = (Number(profile.exp) * 0.6) + ((profile.coins || 0) * 0.4)

      const level = profile.level || Math.floor(Math.sqrt(Number(profile.exp) / 100)) + 1

      return {
        id: profile.id,
        xp: Number(profile.exp),
        level: level,
        rank: profile.hunter_rank || getRank(level),
        combatPower: combatPower,
        prestigeScore: prestigeScore,
        users: {
          name: profile.hunter_name,
          avatar: profile.avatar,
          base_body_url: profile.base_body_url,
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
          is_admin: profile.is_admin,
          referral_code: profile.referral_code,
          active_skin: profile.active_skin,
          cosmetics: cosmeticsMap.get(profile.id) || []
        }
      }
    })

    // Sort by prestige score (60% EXP + 40% Gold) descending
    transformedData.sort((a, b) => (b.prestigeScore || 0) - (a.prestigeScore || 0))

    return NextResponse.json({ leaderboard: transformedData })
  } catch (error: any) {
    console.error('💥 Leaderboard API error:', error)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
