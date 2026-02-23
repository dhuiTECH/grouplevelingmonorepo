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
            level,
            hunter_rank
          )
        `)
        .eq('dungeon_id', dungeonId)
        .in('status', ['pending', 'approved'])
        .order('registered_at', { ascending: true })

      if (error) throw error

      // Fetch cosmetics for all users
      const hunterIds = (registrations || []).map((r: any) => r.hunter_id)
      const { data: allCosmetics } = await supabaseAdmin
        .from('user_cosmetics')
        .select(`
          id,
          hunter_id,
          equipped,
          acquired_at,
          shop_items (
            id,
            name,
            description,
            image_url,
            thumbnail_url,
            slot,
            z_index,
            offset_x,
            offset_y,
            scale,
            rarity,
            is_animated,
            animation_config
          )
        `)
        .in('hunter_id', hunterIds)
        .eq('equipped', true)

      // Group cosmetics by hunter_id
      const cosmeticsMap = new Map<string, any[]>()
      ;(allCosmetics || []).forEach((cosmetic: any) => {
        if (!cosmeticsMap.has(cosmetic.hunter_id)) {
          cosmeticsMap.set(cosmetic.hunter_id, [])
        }
        cosmeticsMap.get(cosmetic.hunter_id)!.push(cosmetic)
      })

      // Format the response
      const formattedSignUps = (registrations || []).map((reg: any) => ({
        id: reg.hunter_id,
        name: reg.profiles?.hunter_name || 'Unknown',
        avatar: reg.profiles?.avatar,
        level: reg.profiles?.level || 1,
        rank: reg.profiles?.hunter_rank || 'E',
        signedUpAt: reg.registered_at,
        status: reg.status,
        cosmetics: cosmeticsMap.get(reg.hunter_id) || []
      }))

      return NextResponse.json({
        signUps: { [dungeonId]: formattedSignUps },
        timestamp: new Date().toISOString()
      })
    } else {
      // Get all registrations grouped by dungeon
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
            level,
            hunter_rank
          )
        `)
        .in('status', ['pending', 'approved'])
        .order('registered_at', { ascending: true })

      if (error) throw error

      // Fetch cosmetics for all users
      const hunterIds = (registrations || []).map((r: any) => r.hunter_id)
      const { data: allCosmetics } = await supabaseAdmin
        .from('user_cosmetics')
        .select(`
          id,
          hunter_id,
          equipped,
          acquired_at,
          shop_items (
            id,
            name,
            description,
            image_url,
            thumbnail_url,
            slot,
            z_index,
            offset_x,
            offset_y,
            scale,
            rarity,
            is_animated,
            animation_config
          )
        `)
        .in('hunter_id', hunterIds)
        .eq('equipped', true)

      // Group cosmetics by hunter_id
      const cosmeticsMap = new Map<string, any[]>()
      ;(allCosmetics || []).forEach((cosmetic: any) => {
        if (!cosmeticsMap.has(cosmetic.hunter_id)) {
          cosmeticsMap.set(cosmetic.hunter_id, [])
        }
        cosmeticsMap.get(cosmetic.hunter_id)!.push(cosmetic)
      })

      // Group by dungeon_id
      const signUpsByDungeon: { [dungeonId: string]: any[] } = {}
      
      ;(registrations || []).forEach((reg: any) => {
        if (!signUpsByDungeon[reg.dungeon_id]) {
          signUpsByDungeon[reg.dungeon_id] = []
        }
        signUpsByDungeon[reg.dungeon_id].push({
          id: reg.hunter_id,
          name: reg.profiles?.hunter_name || 'Unknown',
          avatar: reg.profiles?.avatar,
          level: reg.profiles?.level || 1,
          rank: reg.profiles?.hunter_rank || 'E',
          signedUpAt: reg.registered_at,
          status: reg.status,
          cosmetics: cosmeticsMap.get(reg.hunter_id) || []
        })
      })

      return NextResponse.json({
        signUps: signUpsByDungeon,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error: any) {
    console.error('Error fetching dungeon signups:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch signups',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { dungeonId, hunterId } = await request.json()

    if (!dungeonId || !hunterId) {
      return NextResponse.json({ error: 'Missing dungeonId or hunterId' }, { status: 400 })
    }

    // Check if user already registered
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('dungeon_registrations')
      .select('id, status')
      .eq('dungeon_id', dungeonId)
      .eq('hunter_id', hunterId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError
    }

    if (existing) {
      if (existing.status === 'banned') {
        return NextResponse.json({ error: 'You are banned from this dungeon' }, { status: 403 })
      }
      return NextResponse.json({ error: 'Already registered for this dungeon' }, { status: 400 })
    }

    // Create registration
    const { data: registration, error: insertError } = await supabaseAdmin
      .from('dungeon_registrations')
      .insert({
        hunter_id: hunterId,
        dungeon_id: dungeonId,
        status: 'pending',
        registered_at: new Date().toISOString()
      })
      .select(`
        id,
        hunter_id,
        status,
        registered_at,
        profiles (
          id,
          hunter_name,
          avatar,
          level,
          hunter_rank
        )
      `)
      .single()

    if (insertError) throw insertError

    // Fetch cosmetics for the new registration
    const { data: userCosmetics } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        id,
        hunter_id,
        equipped,
        acquired_at,
        shop_items (
          id,
          name,
          description,
          image_url,
          thumbnail_url,
          slot,
          z_index,
          offset_x,
          offset_y,
          scale,
          rarity,
          is_animated,
          animation_config
        )
      `)
      .eq('hunter_id', hunterId)
      .eq('equipped', true)

    // Format response
    const profile = Array.isArray(registration.profiles) ? registration.profiles[0] : registration.profiles
    const formattedSignUp = {
      id: registration.hunter_id,
      name: profile?.hunter_name || 'Unknown',
      avatar: profile?.avatar,
      level: profile?.level || 1,
      rank: profile?.hunter_rank || 'E',
      signedUpAt: registration.registered_at,
      status: registration.status,
      cosmetics: userCosmetics || []
    }

    // Get all signups for this dungeon
    const { data: allSignUps } = await supabaseAdmin
      .from('dungeon_registrations')
      .select(`
        id,
        hunter_id,
        status,
        registered_at,
        profiles (
          id,
          hunter_name,
          avatar,
          level,
          hunter_rank
        )
      `)
      .eq('dungeon_id', dungeonId)
      .in('status', ['pending', 'approved'])
      .order('registered_at', { ascending: true })

    // Fetch cosmetics for all signups
    const hunterIds = (allSignUps || []).map((r: any) => r.hunter_id)
    const { data: allCosmetics } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        id,
        hunter_id,
        equipped,
        acquired_at,
        shop_items (
          id,
          name,
          description,
          image_url,
          thumbnail_url,
          slot,
          z_index,
          offset_x,
          offset_y,
          scale,
          rarity,
          is_animated,
          animation_config
        )
      `)
      .in('hunter_id', hunterIds)
      .eq('equipped', true)

    // Group cosmetics by hunter_id
    const cosmeticsMap = new Map<string, any[]>()
    ;(allCosmetics || []).forEach((cosmetic: any) => {
      if (!cosmeticsMap.has(cosmetic.hunter_id)) {
        cosmeticsMap.set(cosmetic.hunter_id, [])
      }
      cosmeticsMap.get(cosmetic.hunter_id)!.push(cosmetic)
    })

    const formattedSignUps = (allSignUps || []).map((reg: any) => ({
      id: reg.hunter_id,
      name: reg.profiles?.hunter_name || 'Unknown',
      avatar: reg.profiles?.avatar || '/default-avatar.png',
      level: reg.profiles?.level || 1,
      rank: reg.profiles?.hunter_rank || 'E',
      signedUpAt: reg.registered_at,
      status: reg.status,
      cosmetics: cosmeticsMap.get(reg.hunter_id) || []
    }))

    return NextResponse.json({
      success: true,
      signUps: formattedSignUps
    })
  } catch (error: any) {
    console.error('Error registering for dungeon:', error)
    return NextResponse.json({ 
      error: 'Failed to register for dungeon',
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { dungeonId, hunterId } = await request.json()

    if (!dungeonId || !hunterId) {
      return NextResponse.json({ error: 'Missing dungeonId or hunterId' }, { status: 400 })
    }

    // Delete the registration
    const { error: deleteError } = await supabaseAdmin
      .from('dungeon_registrations')
      .delete()
      .eq('dungeon_id', dungeonId)
      .eq('hunter_id', hunterId)

    if (deleteError) throw deleteError

    // Get remaining signups for this dungeon
    const { data: remainingSignUps } = await supabaseAdmin
      .from('dungeon_registrations')
      .select(`
        id,
        hunter_id,
        status,
        registered_at,
        profiles (
          id,
          hunter_name,
          avatar,
          level,
          hunter_rank
        )
      `)
      .eq('dungeon_id', dungeonId)
      .in('status', ['pending', 'approved'])
      .order('registered_at', { ascending: true })

    // Fetch cosmetics for remaining signups
    const hunterIds = (remainingSignUps || []).map((r: any) => r.hunter_id)
    const { data: allCosmetics } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        id,
        hunter_id,
        equipped,
        acquired_at,
        shop_items (
          id,
          name,
          description,
          image_url,
          thumbnail_url,
          slot,
          z_index,
          offset_x,
          offset_y,
          scale,
          rarity,
          is_animated,
          animation_config
        )
      `)
      .in('hunter_id', hunterIds)
      .eq('equipped', true)

    // Group cosmetics by hunter_id
    const cosmeticsMap = new Map<string, any[]>()
    ;(allCosmetics || []).forEach((cosmetic: any) => {
      if (!cosmeticsMap.has(cosmetic.hunter_id)) {
        cosmeticsMap.set(cosmetic.hunter_id, [])
      }
      cosmeticsMap.get(cosmetic.hunter_id)!.push(cosmetic)
    })

    const formattedSignUps = (remainingSignUps || []).map((reg: any) => ({
      id: reg.hunter_id,
      name: reg.profiles?.hunter_name || 'Unknown',
      avatar: reg.profiles?.avatar || '/default-avatar.png',
      level: reg.profiles?.level || 1,
      rank: reg.profiles?.hunter_rank || 'E',
      signedUpAt: reg.registered_at,
      status: reg.status,
      cosmetics: cosmeticsMap.get(reg.hunter_id) || []
    }))

    return NextResponse.json({
      success: true,
      signUps: formattedSignUps
    })
  } catch (error: any) {
    console.error('Error dropping out of dungeon:', error)
    return NextResponse.json({ 
      error: 'Failed to drop out',
      details: error.message 
    }, { status: 500 })
  }
}
