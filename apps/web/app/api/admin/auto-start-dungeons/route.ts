import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check if supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase not configured')
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    console.log('🔄 Checking for dungeons to auto-start...')

    // Get current time
    const now = new Date()

    // Find dungeons that should auto-start
    const { data: dungeonsToStart, error } = await supabaseAdmin
      .from('dungeons')
      .select('*')
      .eq('auto_start', true)
      .eq('status', 'upcoming') // Only start upcoming dungeons
      .lte('scheduled_start', now.toISOString()) // Start time has passed
      .order('scheduled_start', { ascending: true })

    if (error) {
      console.error('❌ Error fetching dungeons to start:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!dungeonsToStart || dungeonsToStart.length === 0) {
      console.log('✅ No dungeons to auto-start')
      return NextResponse.json({
        success: true,
        message: 'No dungeons to auto-start',
        started: 0
      })
    }

    console.log(`🎯 Found ${dungeonsToStart.length} dungeons to auto-start`)

    // Update dungeons to 'open' status
    const dungeonIds = dungeonsToStart.map((d: any) => d.id)
    const { error: updateError } = await supabaseAdmin
      .from('dungeons')
      .update({ status: 'open' })
      .in('id', dungeonIds)

    if (updateError) {
      console.error('❌ Error updating dungeon status:', updateError)
      return NextResponse.json({ error: 'Failed to update dungeons' }, { status: 500 })
    }

    console.log(`✅ Successfully started ${dungeonsToStart.length} dungeons:`)
    dungeonsToStart.forEach((dungeon: any) => {
      console.log(`   - ${dungeon.name} (${dungeon.id})`)
    })

    return NextResponse.json({
      success: true,
      message: `Started ${dungeonsToStart.length} dungeons`,
      started: dungeonsToStart.length,
      dungeons: dungeonsToStart.map((d: any) => ({ id: d.id, name: d.name }))
    })

  } catch (error) {
    console.error('❌ Auto-start dungeons error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
