import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

const DAILY_LIMIT = 3

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const hunterId = user.id
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const { count, error: countError } = await supabaseAdmin
    .from('food_scanner_usage')
    .select('*', { count: 'exact', head: true })
    .eq('hunter_id', hunterId)
    .gte('used_at', todayStart.toISOString())
    .lt('used_at', todayEnd.toISOString())

  if (countError) {
    console.error('food_scanner_usage count error:', countError)
    return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 })
  }

  return NextResponse.json({
    used: count ?? 0,
    limit: DAILY_LIMIT,
  })
}
