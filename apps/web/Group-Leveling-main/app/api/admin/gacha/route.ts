import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data: collections, error } = await supabaseAdmin
      .from('gacha_collections')
      .select('*, collection_items(shop_item_id)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ collections });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'activate') {
      const { error } = await supabaseAdmin.rpc('activate_gacha_theme', { p_collection_id: data.id });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'update_items') {
      // Clear existing items and add new ones
      await supabaseAdmin.from('collection_items').delete().eq('collection_id', data.id);
      
      if (data.item_ids?.length > 0) {
        const insertData = data.item_ids.map((itemId: string) => ({
          collection_id: data.id,
          shop_item_id: itemId
        }));
        const { error } = await supabaseAdmin.from('collection_items').insert(insertData);
        if (error) throw error;
      }
      return NextResponse.json({ success: true });
    }

    // Create or Update collection
    const { data: collection, error } = await supabaseAdmin
      .from('gacha_collections')
      .upsert({
        id: data.id || undefined,
        name: data.name,
        description: data.description,
        cover_image_url: data.cover_image_url,
        pool_type: data.pool_type || 'gate'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ collection });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID required');

    const { error } = await supabaseAdmin.from('gacha_collections').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
