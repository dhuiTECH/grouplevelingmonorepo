import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { shopItemId, hunterId, currency = 'coins' } = await request.json()

    if (!hunterId || !shopItemId) {
      return NextResponse.json({ error: 'Missing requirements' }, { status: 400 })
    }

    // 1. Get shop item details
    const { data: shopItem, error: itemError } = await supabaseAdmin
      .from('shop_items')
      .select('*')
      .eq('id', shopItemId)
      .single()

    if (itemError || !shopItem) {
      return NextResponse.json({ error: 'Shop item not found or inactive' }, { status: 404 })
    }

    // 2. Get hunter's profile (WITH GENDER)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, coins, gems, gender') // <--- Added gems here
      .eq('id', hunterId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Hunter profile not found' }, { status: 404 })
    }

    // --- 4. SAFE OWNERSHIP CHECK ---
    // We use .maybeSingle() instead of .single()
    // .single() errors out if it finds 0 rows. .maybeSingle() returns null (which is what we want!)
    const { data: existingCosmetic, error: checkError } = await supabaseAdmin
      .from('user_cosmetics')
      .select('id')
      .eq('hunter_id', hunterId)
      .eq('shop_item_id', shopItemId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Check Ownership Error:', checkError);
      return NextResponse.json({ error: 'System verification failed' }, { status: 500 });
    }

    if (existingCosmetic) {
      return NextResponse.json({ error: 'You already own this item' }, { status: 400 });
    }

    // 5. Check Balance
    const currentCoins = Number(profile.coins || 0)
    const currentGems = Number(profile.gems || 0)

    if (currency === 'both') {
      // Require both currencies
      const coinPrice = shopItem.price || 0;
      const gemPrice = shopItem.gem_price || 0;

      if (currentCoins < coinPrice) {
        return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
      }
      if (currentGems < gemPrice) {
        return NextResponse.json({ error: 'Insufficient gems' }, { status: 400 })
      }
    } else if (currency === 'gems') {
      if (currentGems < shopItem.gem_price) {
        return NextResponse.json({ error: 'Insufficient gems' }, { status: 400 })
      }
    } else {
      if (currentCoins < shopItem.price) {
        return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
      }
    }

    // 6. Process Transaction
    let updateData = {};
    let newBalance = 0;

    if (currency === 'both') {
      const coinPrice = shopItem.price || 0;
      const gemPrice = shopItem.gem_price || 0;
      updateData = {
        coins: currentCoins - coinPrice,
        gems: currentGems - gemPrice
      };
    } else if (currency === 'gems') {
      newBalance = currentGems - shopItem.gem_price;
      updateData = { gems: newBalance };
    } else {
      newBalance = currentCoins - shopItem.price;
      updateData = { coins: newBalance };
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', hunterId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to deduct coins' }, { status: 500 })
    }

    // --- 7. GRANT ITEM (Relationship Hint Fix) ---
    const { data: newCosmetic, error: insertError } = await supabaseAdmin
      .from('user_cosmetics')
      .insert([{
        hunter_id: hunterId,
        shop_item_id: shopItemId,
        equipped: false
      }])
      .select(`
        id,
        equipped,
        acquired_at,
        shop_item_id,
        shop_items:shop_item_id (*)
      `) // Use explicit relationship mapping to avoid join errors
      .single();

    if (insertError) {
      console.error('❌ DATABASE INSERT FAILED:', insertError);

      // Rollback currency
      if (currency === 'both') {
        await supabaseAdmin.from('profiles').update({
          coins: currentCoins,
          gems: currentGems
        }).eq('id', hunterId);
      } else {
        await supabaseAdmin.from('profiles').update(
          currency === 'gems' ? { gems: currentGems } : { coins: currentCoins }
        ).eq('id', hunterId);
      }

      return NextResponse.json({
        error: 'Failed to add item to inventory',
        details: insertError.message
      }, { status: 500 });
    }

    // Return appropriate balance(s)
    const responseData: any = { cosmetic: newCosmetic };
    if (currency === 'both') {
      const coinPrice = shopItem.price || 0;
      const gemPrice = shopItem.gem_price || 0;
      responseData.newCoinBalance = currentCoins - coinPrice;
      responseData.newGemBalance = currentGems - gemPrice;
    } else {
      responseData.newBalance = newBalance;
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('Purchase error:', error)
    return NextResponse.json({
      error: 'Failed to purchase item',
      details: error.message
    }, { status: 500 })
  }
}

