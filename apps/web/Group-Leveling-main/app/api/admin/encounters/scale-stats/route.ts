import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

/**
 * Scale HP and damage for all encounter_pool rows by level.
 * HP: 1000+ base, +100 per level (mid of min_level/max_level).
 * Damage: 15 + level * 2.
 */
function scaledStats(minLevel: number, maxLevel: number): { hp: number; damage: number } {
  const midLevel = Math.max(1, Math.round((minLevel + maxLevel) / 2))
  const hp = 1000 + (midLevel - 1) * 100
  const damage = 15 + midLevel * 2
  return { hp, damage }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase env' },
        { status: 503 }
      )
    }

    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error ?? 'Unauthorized' },
        { status: auth.status ?? 401 }
      )
    }

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from('encounter_pool')
      .select('id, min_level, max_level, metadata')

    if (fetchError) {
      console.error('encounter_pool fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch encounters', details: fetchError.message },
        { status: 500 }
      )
    }

    let updated = 0
    for (const row of rows ?? []) {
      const minLevel = Number(row.min_level) ?? 1
      const maxLevel = Number(row.max_level) ?? 99
      const { hp, damage } = scaledStats(minLevel, maxLevel)
      const meta = (row.metadata as Record<string, unknown>) ?? {}
      const stats = (meta.stats as Record<string, unknown>) ?? {}
      const newMetadata = {
        ...meta,
        stats: { ...stats, hp, damage },
      }

      const { error: updateError } = await supabaseAdmin
        .from('encounter_pool')
        .update({ 
          metadata: newMetadata,
          base_hp: hp,
          hp_base: hp,
          base_dmg: damage,
          dmg_base: damage
        })
        .eq('id', row.id)

      if (updateError) {
        console.error('encounter_pool update error:', row.id, updateError)
        return NextResponse.json(
          { error: 'Failed to update encounter', details: updateError.message },
          { status: 500 }
        )
      }
      updated++
    }

    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scale stats failed'
    console.error('Admin encounters scale-stats error:', err)
    return NextResponse.json(
      { error: 'Scale stats failed', details: message },
      { status: 500 }
    )
  }
}
