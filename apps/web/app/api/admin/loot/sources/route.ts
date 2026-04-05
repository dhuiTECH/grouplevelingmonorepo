import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

const SOURCE_TYPES = new Set(['battle', 'chest', 'npc'])

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const poolId = request.nextUrl.searchParams.get('poolId')
    if (!poolId) {
      return NextResponse.json({ error: 'poolId query required' }, { status: 400 })
    }

    const { data: rows, error } = await supabaseAdmin!
      .from('loot_source_map')
      .select('source_type, source_id, loot_pool_id')
      .eq('loot_pool_id', poolId)
      .order('source_type', { ascending: true })
      .order('source_id', { ascending: true })

    if (error) throw error
    return NextResponse.json({ sources: rows ?? [] })
  } catch (e: any) {
    console.error('[admin/loot/sources GET]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to load sources' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json()
    const source_type =
      typeof body.source_type === 'string' ? body.source_type.trim() : ''
    const source_id =
      typeof body.source_id === 'string' ? body.source_id.trim() : ''
    const loot_pool_id =
      typeof body.loot_pool_id === 'string' ? body.loot_pool_id.trim() : ''

    if (!SOURCE_TYPES.has(source_type)) {
      return NextResponse.json(
        { error: 'source_type must be battle, chest, or npc' },
        { status: 400 },
      )
    }
    if (!source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 })
    }
    if (!loot_pool_id) {
      return NextResponse.json({ error: 'loot_pool_id is required' }, { status: 400 })
    }

    const { data: row, error } = await supabaseAdmin!
      .from('loot_source_map')
      .insert({ source_type, source_id, loot_pool_id })
      .select('source_type, source_id, loot_pool_id')
      .single()

    if (error) throw error
    return NextResponse.json({ source: row })
  } catch (e: any) {
    console.error('[admin/loot/sources POST]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to create mapping' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json().catch(() => ({}))
    const source_type =
      typeof body.source_type === 'string' ? body.source_type.trim() : ''
    const source_id =
      typeof body.source_id === 'string' ? body.source_id.trim() : ''

    if (!SOURCE_TYPES.has(source_type)) {
      return NextResponse.json(
        { error: 'source_type must be battle, chest, or npc' },
        { status: 400 },
      )
    }
    if (!source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin!
      .from('loot_source_map')
      .delete()
      .eq('source_type', source_type)
      .eq('source_id', source_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[admin/loot/sources DELETE]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to delete mapping' }, { status: 500 })
  }
}
