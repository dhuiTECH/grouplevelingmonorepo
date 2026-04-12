import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { ITEM_CATEGORIES } from '@/lib/item-category'

const ITEM_CATEGORY_SET = new Set<string>(ITEM_CATEGORIES)

function normalizeItemCategory(raw: unknown, slot: string): string {
  if (typeof raw === 'string' && ITEM_CATEGORY_SET.has(raw)) return raw
  if (slot === 'consumable') return 'consumable'
  if (slot === 'other' || slot === 'misc') return 'misc'
  return 'cosmetic'
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    // Get all shop items (including inactive ones)
    const { data: shopItems, error } = await supabaseAdmin
      .from('shop_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log('🛒 Shop items loaded:', shopItems?.length || 0);
    return NextResponse.json({ shopItems })
  } catch (error) {
    console.error('Admin shop items fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { id, ...updates } = await request.json()

    // Handle data type conversions for new fields
    const processedUpdates = {
      ...updates,
      gender: updates.gender || undefined,
      bonuses: updates.bonuses || undefined,
      price: updates.price ? parseInt(String(updates.price)) : undefined,
      gem_price: updates.gem_price !== undefined ? (updates.gem_price ? parseInt(String(updates.gem_price)) : null) : undefined,
      min_level: updates.min_level ? parseInt(String(updates.min_level)) : undefined,
      class_req: updates.class_req || undefined,
      no_restrictions: typeof updates.no_restrictions === 'boolean' ? updates.no_restrictions : undefined,
      offset_x: updates.offset_x ? parseInt(String(updates.offset_x)) : undefined,
      offset_y: updates.offset_y ? parseInt(String(updates.offset_y)) : undefined,
      z_index: updates.z_index ? parseInt(String(updates.z_index)) : undefined,
      rotation: updates.rotation !== undefined ? parseInt(String(updates.rotation)) : undefined,
      scale: updates.scale ? parseFloat(String(updates.scale)) : undefined,
      offset_x_female: updates.offset_x_female !== undefined ? (updates.offset_x_female !== null ? parseInt(String(updates.offset_x_female)) : null) : undefined,
      offset_y_female: updates.offset_y_female !== undefined ? (updates.offset_y_female !== null ? parseInt(String(updates.offset_y_female)) : null) : undefined,
      scale_female: updates.scale_female !== undefined ? (updates.scale_female !== null ? parseFloat(String(updates.scale_female)) : null) : undefined,
      rotation_female: updates.rotation_female !== undefined ? (updates.rotation_female !== null ? parseInt(String(updates.rotation_female)) : null) : undefined,
      animation_config: updates.animation_config || undefined,
      is_animated: typeof updates.is_animated === 'boolean' ? updates.is_animated : undefined,
      is_stackable: typeof updates.is_stackable === 'boolean' ? updates.is_stackable : undefined,
      item_category:
        typeof updates.item_category === 'string' && ITEM_CATEGORY_SET.has(updates.item_category)
          ? updates.item_category
          : undefined,
      item_effects: updates.item_effects !== undefined ? updates.item_effects : undefined,
      is_gacha_exclusive: typeof updates.is_gacha_exclusive === 'boolean' ? updates.is_gacha_exclusive : undefined,
      collection_name: updates.collection_name !== undefined ? updates.collection_name : undefined,
      collection_id: updates.collection_id !== undefined ? updates.collection_id : undefined,
      is_sellable: typeof updates.is_sellable === 'boolean' ? updates.is_sellable : undefined,
      onboarding_available: typeof updates.onboarding_available === 'boolean' ? updates.onboarding_available : undefined,
      image_base_url: updates.image_base_url !== undefined ? (updates.image_base_url && typeof updates.image_base_url === 'string' ? updates.image_base_url.trim() : null) : undefined,
      skin_tint_hex: updates.skin_tint_hex !== undefined ? (updates.skin_tint_hex && typeof updates.skin_tint_hex === 'string' ? updates.skin_tint_hex.trim() : null) : undefined,
      grip_type: updates.grip_type || undefined,
      weapon_type:
        updates.weapon_type !== undefined
          ? (typeof updates.weapon_type === 'string' && updates.weapon_type.trim() === ''
              ? null
              : updates.weapon_type)
          : undefined
    };

    // Remove undefined values
    Object.keys(processedUpdates).forEach(key => {
      if (processedUpdates[key] === undefined) {
        delete processedUpdates[key];
      }
    });

    let result = await supabaseAdmin
      .from('shop_items')
      .update(processedUpdates)
      .eq('id', id)
      .select()
      .single()

    let { data, error } = result

    // If update failed due to schema cache (is_sellable/onboarding_available not in cache), retry without those columns
    const isSchemaCacheError = error && (
      (typeof error.message === 'string' && (error.message.includes('schema cache') || error.message.includes('Could not find the')))
      || (typeof error.details === 'string' && (error.details.includes('schema cache') || error.details.includes('Could not find the')))
    )
    if (isSchemaCacheError) {
      const minimal = { ...processedUpdates }
      delete (minimal as any).is_sellable
      delete (minimal as any).onboarding_available
      result = await supabaseAdmin.from('shop_items').update(minimal).eq('id', id).select().single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('❌ DB UPDATE ERROR:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({
        error: 'Failed to update shop item',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ shopItem: data })
  } catch (error) {
    console.error('💥 Shop item update error:', error)
    return NextResponse.json({
      error: 'Failed to update shop item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json()
    console.log('📦 Received shop item data:', body)
    
    // Extract new fields
    const {
      name,
      description,
      image_url,
      image_base_url,
      skin_tint_hex,
      thumbnail_url,
      slot,
      bonuses,
      is_animated,
      price,
      gem_price,
      rarity,
      min_level,
      class_req,
      no_restrictions,
      offset_x,
      offset_y,
      z_index,
      rotation,
      scale,
      offset_x_female,
      offset_y_female,
      scale_female,
      rotation_female,
      animation_config,
      gender,
      is_stackable,
      item_effects,
      is_gacha_exclusive,
      collection_name,
      collection_id,
      is_sellable,
      onboarding_available,
      grip_type,
      weapon_type,
      eraser_mask_targets,
      eraser_mask_url,
      eraser_mask_url_female,
      item_category,
    } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
    }

    const imageUrl = typeof image_url === 'string' ? image_url.trim() : ''
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required', details: 'Upload an image first; if you did, the upload may have failed.' }, { status: 400 })
    }

    if (!slot) {
      return NextResponse.json({ error: 'Slot is required' }, { status: 400 })
    }

    // Validate min_level
    if (min_level !== undefined && min_level !== null) {
      const levelNum = parseInt(String(min_level));
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 999) {
        return NextResponse.json({ error: 'Minimum level must be a number between 1 and 999' }, { status: 400 })
      }
    }

    // Validate class_req
    if (class_req && !['All', 'Assassin', 'Fighter', 'Mage', 'Tanker', 'Ranger', 'Healer'].includes(class_req)) {
      return NextResponse.json({ error: 'Class requirement must be one of: All, Assassin, Fighter, Mage, Tanker, Ranger, Healer' }, { status: 400 })
    }

    const normalizedEraserTargets =
      Array.isArray(eraser_mask_targets)
        ? eraser_mask_targets.filter((t: unknown) => typeof t === 'string' && t.trim())
        : typeof eraser_mask_targets === 'string' && eraser_mask_targets.trim() && eraser_mask_targets !== 'none'
          ? [eraser_mask_targets.trim()]
          : []

    const insertData = {
      name: name.trim(),
      item_category: normalizeItemCategory(item_category, String(slot)),
      description: description?.trim() || null,
      image_url: imageUrl,
      image_base_url: typeof image_base_url === 'string' && image_base_url.trim() ? image_base_url.trim() : null,
      skin_tint_hex: typeof skin_tint_hex === 'string' && skin_tint_hex.trim() ? skin_tint_hex.trim() : null,
      thumbnail_url: thumbnail_url || null,
      slot: slot,
      bonuses: bonuses || [], // New bonuses array
      is_animated: Boolean(is_animated),
      price: parseInt(String(price)) || 0,
      gem_price: gem_price ? parseInt(String(gem_price)) : null,
      rarity: rarity || 'common',
      min_level: no_restrictions ? null : (min_level ? parseInt(String(min_level)) : 1),
      class_req: no_restrictions ? null : (class_req || 'All'),
      no_restrictions: Boolean(no_restrictions),
      gender: gender || null,
      // New positioning fields
      offset_x: parseInt(String(offset_x)) || 0,
      offset_y: parseInt(String(offset_y)) || 0,
      z_index: parseInt(String(z_index)) || 1,
      rotation: parseInt(String(rotation)) || 0,
      scale: parseFloat(String(scale)) || 1.0,
      offset_x_female: offset_x_female !== undefined && offset_x_female !== null ? parseInt(String(offset_x_female)) : null,
      offset_y_female: offset_y_female !== undefined && offset_y_female !== null ? parseInt(String(offset_y_female)) : null,
      scale_female: scale_female !== undefined && scale_female !== null ? parseFloat(String(scale_female)) : null,
      rotation_female: rotation_female !== undefined && rotation_female !== null ? parseInt(String(rotation_female)) : null,
      animation_config: animation_config || null,
      is_stackable: Boolean(is_stackable),
      item_effects: item_effects || null,
      is_gacha_exclusive: Boolean(is_gacha_exclusive),
      collection_name: collection_name || 'Standard',
      collection_id: collection_id || null,
      is_sellable: typeof is_sellable === 'boolean' ? is_sellable : true,
      onboarding_available: typeof onboarding_available === 'boolean' ? onboarding_available : false,
      grip_type: grip_type || null,
      weapon_type:
        typeof weapon_type === 'string' && weapon_type.trim() ? weapon_type.trim() : null,
      eraser_mask_targets: normalizedEraserTargets.length > 0 ? normalizedEraserTargets : null,
      eraser_mask_url:
        typeof eraser_mask_url === 'string' && eraser_mask_url.trim() ? eraser_mask_url.trim() : null,
      eraser_mask_url_female:
        typeof eraser_mask_url_female === 'string' && eraser_mask_url_female.trim()
          ? eraser_mask_url_female.trim()
          : null
    };

    console.log('💾 DB INSERT START:', insertData);
    console.log('🔍 Validating slot value:', slot);

    let data: any = null
    let error: any = null

    const result = await supabaseAdmin
      .from('shop_items')
      .insert([insertData])
      .select()
      .single()

    data = result.data
    error = result.error

    // If insert failed due to PostgREST schema cache (columns or function not in cache), retry via RPC then fallback without optional columns
    const isSchemaCacheError = error && (
      (typeof error.message === 'string' && (error.message.includes('schema cache') || error.message.includes('Could not find the')))
      || (typeof error.details === 'string' && (error.details.includes('schema cache') || error.details.includes('Could not find the')))
    )
    if (isSchemaCacheError) {
      console.warn('⚠️ Schema cache error, retrying via insert_shop_item RPC:', error?.message || error?.details)
      const rpcResult = await supabaseAdmin.rpc('insert_shop_item', { item: insertData })
      if (!rpcResult.error && rpcResult.data) {
        const rows = Array.isArray(rpcResult.data) ? rpcResult.data : [rpcResult.data]
        data = rows?.[0] ?? null
        error = data ? null : new Error('RPC returned no row')
      } else {
        // RPC failed (e.g. function not in schema cache) — fallback: insert without is_sellable and onboarding_available so insert succeeds
        console.warn('⚠️ RPC failed, retrying insert without is_sellable/onboarding_available:', rpcResult.error?.message)
        const insertDataMinimal = { ...insertData }
        delete (insertDataMinimal as any).is_sellable
        delete (insertDataMinimal as any).onboarding_available
        const retryResult = await supabaseAdmin.from('shop_items').insert([insertDataMinimal]).select().single()
        data = retryResult.data
        error = retryResult.error
      }
    }

    if (error || !data) {
      console.error('❌ DB INSERT ERROR:', error);
      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
      }
      return NextResponse.json({
        error: 'Failed to create shop item',
        details: error?.message ?? 'No data returned',
        code: error?.code,
        slot: slot
      }, { status: 500 })
    }

    console.log('✅ Shop item created successfully:', data);
    return NextResponse.json({ shopItem: data })
  } catch (error: any) {
    console.error('💥 Shop item creation error:', error)
    return NextResponse.json({
      error: 'Failed to create shop item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    // 1. Fetch Item to get asset URLs before deletion
    const { data: itemData, error: fetchError } = await supabaseAdmin
      .from('shop_items')
      .select('image_url, thumbnail_url, image_base_url, eraser_mask_url, eraser_mask_url_female')
      .eq('id', itemId)
      .single();

    if (fetchError || !itemData) {
      console.warn('⚠️ Could not fetch shop item data before delete:', fetchError?.message);
    }

    // 2. Delete from DB
    const { error } = await supabaseAdmin
      .from('shop_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    // 3. Cleanup storage assets
    if (itemData) {
      const BUCKET = 'game-assets';
      const assetsToDelete = [
        itemData.image_url, 
        itemData.thumbnail_url, 
        itemData.image_base_url,
        itemData.eraser_mask_url,
        itemData.eraser_mask_url_female
      ].filter(Boolean);

      for (const url of assetsToDelete) {
        try {
          // Extract path from URL: https://.../storage/v1/object/public/game-assets/path/to/file
          const pathPart = url.split(`/${BUCKET}/`)[1]?.split('?')[0];
          if (pathPart) {
            console.log(`🗑️ Deleting shop asset from storage: ${pathPart}`);
            await supabaseAdmin.storage.from(BUCKET).remove([pathPart]);
          }
        } catch (storageErr) {
          console.error(`Failed to delete storage asset ${url}:`, storageErr);
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Shop item delete error:', error)
    return NextResponse.json({ error: 'Failed to delete shop item' }, { status: 500 })
  }
}
