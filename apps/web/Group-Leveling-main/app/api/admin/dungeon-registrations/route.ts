import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const dungeonId = request.nextUrl.searchParams.get('dungeon_id')

    if (dungeonId) {
      // Get registrations for a specific dungeon
      const { data: registrations, error } = await supabaseAdmin
        .from('dungeon_registrations')
        .select(`
          id,
          hunter_id,
          status,
          registered_at,
          completed_at,
          profiles (
            id,
            hunter_name,
            avatar,
            email,
            level,
            hunter_rank
          )
        `)
        .eq('dungeon_id', dungeonId)
        .order('registered_at', { ascending: true })

      if (error) throw error

      return NextResponse.json({ registrations: registrations || [] })
    } else {
      // Get all registrations
      const { data: registrations, error } = await supabaseAdmin
        .from('dungeon_registrations')
        .select(`
          id,
          hunter_id,
          dungeon_id,
          status,
          registered_at,
          completed_at,
          profiles (
            id,
            hunter_name,
            avatar,
            email,
            level,
            hunter_rank
          ),
          dungeons (
            id,
            name
          )
        `)
        .order('registered_at', { ascending: false })

      if (error) throw error

      return NextResponse.json({ registrations: registrations || [] })
    }
  } catch (error: any) {
    console.error('Error fetching dungeon registrations:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch registrations',
      details: error.message 
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { registrationId, action } = await request.json()

    if (!registrationId || !action) {
      return NextResponse.json({ error: 'Missing registrationId or action' }, { status: 400 })
    }

    let updateData: any = {}

    if (action === 'remove') {
      // Delete the registration
      const { error: deleteError } = await supabaseAdmin
        .from('dungeon_registrations')
        .delete()
        .eq('id', registrationId)

      if (deleteError) throw deleteError

      return NextResponse.json({ success: true, message: 'Registration removed' })
    } else if (action === 'ban') {
      updateData.status = 'banned'
    } else if (action === 'approve') {
      updateData.status = 'approved'
    } else if (action === 'reject') {
      updateData.status = 'rejected'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update the registration
    const { data, error } = await supabaseAdmin
      .from('dungeon_registrations')
      .update(updateData)
      .eq('id', registrationId)
      .select(`
        id,
        hunter_id,
        status,
        registered_at,
        profiles (
          id,
          hunter_name,
          avatar,
          email,
          level,
          hunter_rank
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, registration: data })
  } catch (error: any) {
    console.error('Error updating dungeon registration:', error)
    return NextResponse.json({ 
      error: 'Failed to update registration',
      details: error.message 
    }, { status: 500 })
  }
}

