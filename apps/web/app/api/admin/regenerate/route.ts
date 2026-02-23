import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Run the regeneration function
    const { data, error } = await supabaseAdmin.rpc('regenerate_all_hp_mp')

    if (error) {
      console.error('Regeneration error:', error)
      return NextResponse.json(
        { error: 'Failed to run regeneration', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Regenerated HP/MP for ${data} users`)

    return NextResponse.json({
      success: true,
      usersUpdated: data,
      message: `Successfully regenerated HP/MP for ${data} users`
    })

  } catch (error: any) {
    console.error('Regeneration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check regeneration status
export async function GET(request: NextRequest) {
  try {
    // Get count of users who need regeneration
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, current_hp, current_mp, level, end_stat, int_stat, wil_stat, current_class')
      .gt('current_hp', 0) // Only count active users

    if (error) {
      return NextResponse.json({ error: 'Failed to check regeneration status' }, { status: 500 })
    }

    let needsRegeneration = 0

    for (const user of data) {
      const maxHP = calculateMaxHP(user.level, user.end_stat, user.wil_stat, user.current_class)
      const maxMP = calculateMaxMP(user.int_stat)

      if (user.current_hp < maxHP || user.current_mp < maxMP) {
        needsRegeneration++
      }
    }

    return NextResponse.json({
      totalUsers: data.length,
      needsRegeneration,
      fullyRegenerated: data.length - needsRegeneration
    })

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions (duplicated from client-side for server use)
function calculateMaxHP(level: number, end_stat: number, wil_stat: number, current_class: string): number {
  const baseHP = 100 + (level * 10)
  const endMultiplier = current_class === 'Tanker' ? 10 : 5
  const vitalityHPBonus = wil_stat - 10
  return baseHP + (end_stat * endMultiplier) + vitalityHPBonus
}

function calculateMaxMP(int_stat: number): number {
  return 50 + (int_stat * 10)
}