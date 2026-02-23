import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const hunterId = request.nextUrl.searchParams.get('hunter_id')

    if (!hunterId) {
      return NextResponse.json({ error: 'Hunter ID is required' }, { status: 400 })
    }

    // FIXED QUERY: Explicit relationship hint to avoid cache errors
    const { data: cosmetics, error } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        *,
        shop_items!shop_item_id (*)
      `)
      .eq('hunter_id', hunterId)
      .order('acquired_at', { ascending: false });

    if (error) {
      console.error('❌ Database Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cosmetics: cosmetics || [] });
  } catch (error: any) {
    console.error('💥 API Crash:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { cosmeticId, equipped, hunterId } = await request.json()

    if (!hunterId) {
      return NextResponse.json({ error: 'Hunter ID is required' }, { status: 400 })
    }

    if (!cosmeticId) {
      return NextResponse.json({ error: 'Cosmetic ID is required' }, { status: 400 })
    }

    // If equipping, unequip all items in the same slot first
    if (equipped) {
      // Get the slot of the item being equipped
      const { data: cosmeticData } = await supabaseAdmin
        .from('user_cosmetics')
        .select(`
          shop_item_id,
          shop_items!inner(slot)
        `)
        .eq('id', cosmeticId)
        .eq('hunter_id', hunterId)
        .single()

      if (cosmeticData?.shop_items) {
        // Handle the joined data - shop_items will be an object, not an array in this query
        const shopItem = Array.isArray(cosmeticData.shop_items)
          ? cosmeticData.shop_items[0]
          : cosmeticData.shop_items
        const slot = shopItem?.slot

        if (slot) {
          // Special handling for avatars - update profile avatar field
          if (slot === 'avatar') {
            // Get the avatar image URL
            const { data: avatarItem } = await supabaseAdmin
              .from('shop_items')
              .select('image_url')
              .eq('id', cosmeticData.shop_item_id)
              .single()

            if (avatarItem) {
              // Update profile avatar
              await supabaseAdmin
                .from('profiles')
                .update({ avatar: avatarItem.image_url })
                .eq('id', hunterId)
            }
          }

          // Get all shop items with the same slot
          const { data: sameSlotItems } = await supabaseAdmin
            .from('shop_items')
            .select('id')
            .eq('slot', slot)

          if (sameSlotItems && sameSlotItems.length > 0) {
            const itemIds = sameSlotItems.map(item => item.id)

            // Unequip all cosmetics for this hunter with items in the same slot
            await supabaseAdmin
              .from('user_cosmetics')
              .update({ equipped: false })
              .eq('hunter_id', hunterId)
              .in('shop_item_id', itemIds)
          }
        }
      }
    } else {
      // If unequipping, check if we need to restore default avatar
      const { data: cosmeticData } = await supabaseAdmin
        .from('user_cosmetics')
        .select(`
          shop_item_id,
          shop_items!inner(slot)
        `)
        .eq('id', cosmeticId)
        .eq('hunter_id', hunterId)
        .single()

      if (cosmeticData?.shop_items) {
        const shopItem = Array.isArray(cosmeticData.shop_items)
          ? cosmeticData.shop_items[0]
          : cosmeticData.shop_items
        const slot = shopItem?.slot

        // If unequipping an avatar, check if any other avatars are equipped
        if (slot === 'avatar') {
          // Check if there are any other equipped avatar cosmetics
          const { data: equippedAvatars } = await supabaseAdmin
            .from('user_cosmetics')
            .select(`
              id,
              shop_items!inner(slot)
            `)
            .eq('hunter_id', hunterId)
            .eq('equipped', true)
            .neq('id', cosmeticId) // Exclude the one we're unequipping

          const hasOtherEquippedAvatar = equippedAvatars?.some(cosmetic => {
            const item = Array.isArray(cosmetic.shop_items)
              ? cosmetic.shop_items[0]
              : cosmetic.shop_items
            return item?.slot === 'avatar'
          })

          // If no other avatar cosmetics are equipped, restore default avatar based on gender
          if (!hasOtherEquippedAvatar) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('gender, base_body_url')
              .eq('id', hunterId)
              .single()

            if (profile) {
              let defaultAvatar = '/NoobMan.png' // default
              if (profile.gender === 'Female') {
                defaultAvatar = '/NoobWoman.png'
              } else if (profile.gender === 'Non-binary') {
                defaultAvatar = (profile.base_body_url === '/NoobMan.png' || profile.base_body_url === '/NoobWoman.png') ? profile.base_body_url : '/NoobMan.png'
              }

              // Restore default avatar
              await supabaseAdmin
                .from('profiles')
                .update({ avatar: defaultAvatar })
                .eq('id', hunterId)
            }
          }
        }
      }
    }

    // Update the specific cosmetic
    const { data, error } = await supabaseAdmin
      .from('user_cosmetics')
      .update({ equipped })
      .eq('id', cosmeticId)
      .eq('hunter_id', hunterId)
      .select(`
        id,
        equipped,
        acquired_at,
        shop_items (
          id,
          name,
          description,
          image_url,
          slot,
          z_index,
          rarity
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ cosmetic: data })
  } catch (error: any) {
    console.error('Cosmetic update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update cosmetic',
      details: error.message 
    }, { status: 500 })
  }
}

