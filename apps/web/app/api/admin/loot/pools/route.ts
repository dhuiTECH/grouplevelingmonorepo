import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { data: pools, error } = await supabaseAdmin!
      .from('loot_pools')
      .select('id, name, notes, created_at')
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ pools: pools ?? [] })
  } catch (e: any) {
    console.error('[admin/loot/pools GET]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to load pools' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null

    const { data: pool, error } = await supabaseAdmin!
      .from('loot_pools')
      .insert({ name, notes: notes || null })
      .select('id, name, notes, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ pool })
  } catch (e: any) {
    console.error('[admin/loot/pools POST]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to create pool' }, { status: 500 })
  }
}
