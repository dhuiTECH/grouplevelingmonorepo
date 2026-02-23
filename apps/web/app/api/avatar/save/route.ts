import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const CREATOR_SLOTS = ['avatar', 'base_body', 'face_eyes', 'face_mouth', 'hair', 'face', 'body']

function toIdList(val: string | number | (string | number)[] | undefined): (string | number)[] {
  if (val == null) return []
  if (Array.isArray(val)) return val.filter((id) => id !== '' && id !== null && id !== undefined)
  return [val]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hunterId, baseId, partIds = [], base_body_tint_hex: overrideTintHex } = body as { hunterId?: string; baseId?: string | number; partIds?: (string | number)[]; base_body_tint_hex?: string }

    if (!hunterId) {
      return NextResponse.json({ error: 'hunterId is required' }, { status: 400 })
    }

    const selectedIds = [...toIdList(baseId), ...toIdList(partIds)]
    if (selectedIds.length === 0) {
      return NextResponse.json({ error: 'At least one of baseId or partIds is required' }, { status: 400 })
    }

    // Fetch selected items to get slots and base image
    const { data: selectedItems, error: itemsError } = await supabaseAdmin
      .from('shop_items')
      .select('id, slot, image_url, image_base_url, skin_tint_hex')
      .in('id', selectedIds)

    if (itemsError || !selectedItems?.length) {
      return NextResponse.json({ error: 'Invalid base or part IDs' }, { status: 400 })
    }

    const slotSet = new Set(selectedItems.map((i: any) => (i.slot || '').toLowerCase()))

    // Unequip all user_cosmetics for this hunter that are in creator slots (so we can re-equip only selected)
    const { data: existingCosmetics } = await supabaseAdmin
      .from('user_cosmetics')
      .select('id, shop_item_id, shop_items!inner(slot)')
      .eq('hunter_id', hunterId)

    const toUnequip: string[] = []
    if (existingCosmetics) {
      for (const c of existingCosmetics as any[]) {
        const si = Array.isArray(c.shop_items) ? c.shop_items[0] : c.shop_items
        const slot = (si?.slot || '').toLowerCase()
        if (CREATOR_SLOTS.includes(slot)) toUnequip.push(c.id)
      }
    }
    if (toUnequip.length > 0) {
      await supabaseAdmin
        .from('user_cosmetics')
        .update({ equipped: false })
        .eq('hunter_id', hunterId)
        .in('id', toUnequip)
    }

    // Ensure user has each selected item in user_cosmetics; set equipped: true
    for (const id of selectedIds) {
      const { data: existing } = await supabaseAdmin
        .from('user_cosmetics')
        .select('id')
        .eq('hunter_id', hunterId)
        .eq('shop_item_id', id)
        .single()

      if (!existing) {
        await supabaseAdmin
          .from('user_cosmetics')
          .insert({ hunter_id: hunterId, shop_item_id: id, equipped: true })
      } else {
        await supabaseAdmin
          .from('user_cosmetics')
          .update({ equipped: true })
          .eq('hunter_id', hunterId)
          .eq('shop_item_id', id)
      }
    }

    // Update profile avatar and base body (detail + silhouette + tint) from selected base (avatar/base_body slot)
    const baseItem = selectedItems.find((i: any) => (i.slot || '').toLowerCase() === 'avatar' || (i.slot || '').toLowerCase() === 'base_body') || (baseId != null ? selectedItems.find((i: any) => i.id === baseId || String(i.id) === String(baseId)) : null)
    if (baseItem?.image_url) {
      const profileUpdate: Record<string, unknown> = {
        avatar: baseItem.image_url,
        base_body_url: baseItem.image_url
      }
      if (baseItem.image_base_url) profileUpdate.base_body_silhouette_url = baseItem.image_base_url
      const tintHex = overrideTintHex && typeof overrideTintHex === 'string' ? overrideTintHex.trim() : (baseItem.skin_tint_hex && typeof baseItem.skin_tint_hex === 'string' ? baseItem.skin_tint_hex.trim() : null)
      profileUpdate.base_body_tint_hex = tintHex || '#FFDBAC'
      await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', hunterId)
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, hunter_name, avatar, base_body_url')
      .eq('id', hunterId)
      .single()

    return NextResponse.json({ success: true, profile: profile || undefined })
  } catch (err: any) {
    console.error('Avatar save error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to save avatar' }, { status: 500 })
  }
}
