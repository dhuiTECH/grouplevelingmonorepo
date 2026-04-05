import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (body.notes !== undefined) updates.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: pool, error } = await supabaseAdmin!
      .from('loot_pools')
      .update(updates)
      .eq('id', id)
      .select('id, name, notes, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ pool })
  } catch (e: any) {
    console.error('[admin/loot/pools PATCH]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to update pool' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { id } = await context.params

    const { error } = await supabaseAdmin!.from('loot_pools').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[admin/loot/pools DELETE]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to delete pool' }, { status: 500 })
  }
}
