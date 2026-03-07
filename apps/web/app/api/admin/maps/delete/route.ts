import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Request Body
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Map ID is required' }, { status: 400 });
    }

    // 3. Fetch Map to get asset URLs before deletion
    const { data: mapData, error: fetchError } = await supabaseAdmin
      .from('maps')
      .select('image_url, background_url')
      .eq('id', id)
      .single();

    if (fetchError || !mapData) {
      throw new Error(`Failed to fetch map data: ${fetchError?.message || 'Map not found'}`);
    }

    // 4. Delete dependent world_map_nodes first (FK: world_map_nodes_map_id_fkey)
    const { error: nodesError } = await supabaseAdmin
      .from('world_map_nodes')
      .delete()
      .eq('map_id', id);

    if (nodesError) {
      throw new Error(`Failed to delete map nodes: ${nodesError.message}`);
    }

    // 5. Delete Map from Database (using Admin client)
    const { error: deleteError } = await supabaseAdmin
      .from('maps')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete map: ${deleteError.message}`);
    }

    // 6. Delete files from storage
    const assetsToDelete = [mapData.image_url, mapData.background_url].filter(Boolean);
    const BUCKET = 'game-assets';

    for (const url of assetsToDelete) {
      try {
        // Extract path from URL: https://.../storage/v1/object/public/game-assets/path/to/file
        const pathPart = url.split(`/${BUCKET}/`)[1]?.split('?')[0];
        if (pathPart) {
          console.log(`🗑️ Deleting storage asset: ${pathPart}`);
          await supabaseAdmin.storage.from(BUCKET).remove([pathPart]);
        }
      } catch (storageErr) {
        console.error(`Failed to delete storage asset ${url}:`, storageErr);
        // Don't throw, we want the response to succeed even if storage deletion fails
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Map delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
