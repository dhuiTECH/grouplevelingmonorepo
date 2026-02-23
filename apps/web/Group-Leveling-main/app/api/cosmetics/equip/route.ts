// FILE: app/api/cosmetics/equip/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { cosmeticId, equipped, hunterId } = await request.json();

    if (!hunterId) {
      return NextResponse.json({ error: 'Hunter ID is required' }, { status: 400 });
    }
    if (!cosmeticId) {
      return NextResponse.json({ error: 'Cosmetic ID is required' }, { status: 400 });
    }

    // --- TRANSACTION START ---
    const { data: cosmeticData, error: cosmeticError } = await supabaseAdmin
      .from('user_cosmetics')
      .select('*, shop_items(*)')
      .eq('id', cosmeticId)
      .single();

    if (cosmeticError || !cosmeticData) {
      throw new Error('Cosmetic not found or failed to fetch.');
    }

    const item = cosmeticData.shop_items as any;
    const slot = item?.slot;

    if (equipped && slot === 'other') {
      return NextResponse.json({ error: 'This item is a consumable and cannot be equipped.' }, { status: 400 });
    }

    const accessorySlots = ['accessory', 'jewelry', 'charms', 'scarves', 'earrings'];
    const isAccessory = accessorySlots.includes(slot);

    // Fetch user profile to check current gender
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('gender')
      .eq('id', hunterId)
      .single();

    if (profileError) throw profileError;

    const rawUserGender = profile.gender;
    const userGender = (Array.isArray(rawUserGender) ? (rawUserGender[0] || 'male') : rawUserGender || 'male').toLowerCase();
    const itemGenders = Array.isArray(item.gender) ? item.gender : [item.gender];
    const itemGendersLower = itemGenders.map((g: string) => typeof g === 'string' ? g.toLowerCase() : g);

    // Gender Compatibility Check (only when equipping, not unequipping)
    if (equipped && slot !== 'avatar') {
      const isUnisex = itemGendersLower.includes('unisex');
      const isCompatible = itemGendersLower.includes(userGender);
      
      if (!isUnisex && !isCompatible) {
        return NextResponse.json({ 
          error: `Gender restriction: This item is for ${itemGenders.join('/')} characters only.` 
        }, { status: 400 });
      }
    }

    if (equipped && slot) {
      if (isAccessory) {
        // Check current number of equipped accessories
        const { data: equippedAccessories, error: countError } = await supabaseAdmin
          .from('user_cosmetics')
          .select('id, shop_items!inner(slot)')
          .eq('hunter_id', hunterId)
          .eq('equipped', true);

        if (countError) throw countError;

        const accessoryCount = equippedAccessories.filter(c => accessorySlots.includes((c.shop_items as any)?.slot)).length;

        if (accessoryCount >= 6) {
          return NextResponse.json({ error: 'Accessory limit reached (6 max).' }, { status: 400 });
        }
      } else {
        // Unequip all items in the same slot for non-accessories
        const { data: sameSlotItems } = await supabaseAdmin
          .from('shop_items')
          .select('id')
          .eq('slot', slot);
        
        if (sameSlotItems) {
          const itemIds = sameSlotItems.map(item => item.id);
          await supabaseAdmin
            .from('user_cosmetics')
            .update({ equipped: false })
            .eq('hunter_id', hunterId)
            .in('shop_item_id', itemIds);
        }
      }
    }

    // Special handling for Avatar change: Update profile gender and unequip incompatible items
    if (equipped && slot === 'avatar') {
      const newGender = itemGendersLower.find((g: string) => g !== 'unisex') || 'male';
      const capitalizedGender = newGender.charAt(0).toUpperCase() + newGender.slice(1);
      
      // Update profile gender
      await supabaseAdmin
        .from('profiles')
        .update({ gender: capitalizedGender })
        .eq('id', hunterId);

      // Unequip incompatible items if gender changed
      if (newGender !== userGender) {
        const { data: currentlyEquipped } = await supabaseAdmin
          .from('user_cosmetics')
          .select('id, shop_items!inner(gender, slot)')
          .eq('hunter_id', hunterId)
          .eq('equipped', true);

        if (currentlyEquipped) {
          for (const eqItem of currentlyEquipped) {
            // Don't unequip the item we are currently equipping (the avatar)
            if (eqItem.id === cosmeticId) continue;
            
            const eqItemShopItem = eqItem.shop_items as any;
            const eqItemGender = Array.isArray(eqItemShopItem) ? eqItemShopItem[0]?.gender : eqItemShopItem?.gender;
            const eqItemGenders = Array.isArray(eqItemGender) ? eqItemGender : [eqItemGender];
            const eqItemGendersLower = eqItemGenders.map((g: string) => typeof g === 'string' ? g.toLowerCase() : g);
            
            if (!eqItemGendersLower.includes('unisex') && !eqItemGendersLower.includes(newGender)) {
              await supabaseAdmin
                .from('user_cosmetics')
                .update({ equipped: false })
                .eq('id', eqItem.id);
            }
          }
        }
      }
    }

    // Now, equip the new item
    const { error: updateError } = await supabaseAdmin
      .from('user_cosmetics')
      .update({ equipped })
      .eq('id', cosmeticId);

    if (updateError) {
      throw updateError;
    }
    
    // --- TRANSACTION END ---

    // Fetch updated profile in case gender changed
    const { data: updatedProfile, error: updatedProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', hunterId)
      .single();

    // Fetch all updated cosmetics for the user
    const { data: updatedCosmetics, error: fetchError } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        *,
        shop_items!inner(*)
      `)
      .eq('hunter_id', hunterId);

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({ updatedCosmetics, updatedProfile });

  } catch (error: any) {
    console.error('Equip Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
}
