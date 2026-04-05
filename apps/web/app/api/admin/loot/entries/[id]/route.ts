import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

function parseUpdatePayload(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {}

  if (body.weight !== undefined) {
    const w =
      typeof body.weight === 'number'
        ? body.weight
        : parseInt(String(body.weight), 10)
    if (!Number.isFinite(w) || w < 1) {
      return { error: 'weight must be an integer >= 1' as const }
    }
    updates.weight = Math.floor(w)
  }

  if (body.sort_order !== undefined) {
    updates.sort_order = Number.isFinite(Number(body.sort_order))
      ? Math.floor(Number(body.sort_order))
      : 0
  }

  if (body.exp_delta !== undefined) {
    updates.exp_delta =
      body.exp_delta === null || body.exp_delta === ''
        ? null
        : Math.floor(Number(body.exp_delta))
  }
  if (body.coins_delta !== undefined) {
    updates.coins_delta =
      body.coins_delta === null || body.coins_delta === ''
        ? null
        : Math.floor(Number(body.coins_delta))
  }
  if (body.gems_delta !== undefined) {
    updates.gems_delta =
      body.gems_delta === null || body.gems_delta === ''
        ? null
        : Math.floor(Number(body.gems_delta))
  }

  if (body.shop_item_id !== undefined) {
    updates.shop_item_id =
      typeof body.shop_item_id === 'string' && body.shop_item_id.trim()
        ? body.shop_item_id.trim()
        : null
  }

  if (body.quantity !== undefined) {
    const q = Number(body.quantity)
    if (!Number.isFinite(q) || q < 1 || q > 999) {
      return { error: 'quantity must be 1–999' as const }
    }
    updates.quantity = Math.floor(q)
  }

  return { updates }
}

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
    const parsed = parseUpdatePayload(body)
    if ('error' in parsed && parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { updates } = parsed
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin!
      .from('loot_pool_entries')
      .select(
        'id, loot_pool_id, weight, sort_order, exp_delta, coins_delta, gems_delta, shop_item_id, quantity',
      )
      .eq('id', id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const merged = { ...existing, ...updates } as typeof existing
    const hasCurrency =
      (merged.exp_delta != null && merged.exp_delta !== 0) ||
      (merged.coins_delta != null && merged.coins_delta !== 0) ||
      (merged.gems_delta != null && merged.gems_delta !== 0)
    const hasItem = !!merged.shop_item_id
    if (!hasCurrency && !hasItem) {
      return NextResponse.json(
        { error: 'Reward must include currency deltas or a shop item' },
        { status: 400 },
      )
    }

    const { data: entry, error } = await supabaseAdmin!
      .from('loot_pool_entries')
      .update(updates)
      .eq('id', id)
      .select(
        'id, loot_pool_id, weight, sort_order, exp_delta, coins_delta, gems_delta, shop_item_id, quantity',
      )
      .single()

    if (error) throw error
    return NextResponse.json({ entry })
  } catch (e: any) {
    console.error('[admin/loot/entries PATCH]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to update entry' }, { status: 500 })
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
    const { error } = await supabaseAdmin!.from('loot_pool_entries').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[admin/loot/entries DELETE]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to delete entry' }, { status: 500 })
  }
}
