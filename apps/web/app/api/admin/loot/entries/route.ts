import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

function parseEntryPayload(body: Record<string, unknown>, poolId?: string) {
  const loot_pool_id =
    poolId ?? (typeof body.loot_pool_id === 'string' ? body.loot_pool_id : '')
  if (!loot_pool_id) {
    return { error: 'loot_pool_id is required' as const }
  }

  const weightRaw = body.weight
  const weight =
    typeof weightRaw === 'number'
      ? weightRaw
      : parseInt(String(weightRaw ?? ''), 10)
  if (!Number.isFinite(weight) || weight < 1) {
    return { error: 'weight must be an integer >= 1' as const }
  }

  const sort_order =
    body.sort_order != null
      ? Number(body.sort_order)
      : 0

  const exp_delta =
    body.exp_delta != null && body.exp_delta !== ''
      ? Number(body.exp_delta)
      : null
  const coins_delta =
    body.coins_delta != null && body.coins_delta !== ''
      ? Number(body.coins_delta)
      : null
  const gems_delta =
    body.gems_delta != null && body.gems_delta !== ''
      ? Number(body.gems_delta)
      : null

  const shop_item_id =
    typeof body.shop_item_id === 'string' && body.shop_item_id.trim()
      ? body.shop_item_id.trim()
      : null

  let quantity = 1
  if (body.quantity != null && body.quantity !== '') {
    quantity = Number(body.quantity)
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
      return { error: 'quantity must be 1–999' as const }
    }
  }

  const hasCurrency =
    (exp_delta != null && exp_delta !== 0) ||
    (coins_delta != null && coins_delta !== 0) ||
    (gems_delta != null && gems_delta !== 0)
  const hasItem = !!shop_item_id

  if (!hasCurrency && !hasItem) {
    return {
      error:
        'Reward must include at least one non-zero currency delta or a shop item' as const,
    }
  }

  return {
    row: {
      loot_pool_id,
      weight: Math.floor(weight),
      sort_order: Number.isFinite(sort_order) ? Math.floor(sort_order) : 0,
      exp_delta: exp_delta != null && exp_delta !== 0 ? Math.floor(exp_delta) : null,
      coins_delta: coins_delta != null && coins_delta !== 0 ? Math.floor(coins_delta) : null,
      gems_delta: gems_delta != null && gems_delta !== 0 ? Math.floor(gems_delta) : null,
      shop_item_id,
      quantity: hasItem ? quantity : 1,
    },
  }
}

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

    const { data: entries, error } = await supabaseAdmin!
      .from('loot_pool_entries')
      .select(
        'id, loot_pool_id, weight, sort_order, exp_delta, coins_delta, gems_delta, shop_item_id, quantity',
      )
      .eq('loot_pool_id', poolId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw error
    return NextResponse.json({ entries: entries ?? [] })
  } catch (e: any) {
    console.error('[admin/loot/entries GET]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to load entries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json()
    const parsed = parseEntryPayload(body)
    if ('error' in parsed && parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { row } = parsed
    const { data: entry, error } = await supabaseAdmin!
      .from('loot_pool_entries')
      .insert(row)
      .select(
        'id, loot_pool_id, weight, sort_order, exp_delta, coins_delta, gems_delta, shop_item_id, quantity',
      )
      .single()

    if (error) throw error
    return NextResponse.json({ entry })
  } catch (e: any) {
    console.error('[admin/loot/entries POST]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to create entry' }, { status: 500 })
  }
}
