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

    // 3. Delete dependent world_map_nodes first (FK: world_map_nodes_map_id_fkey)
    const { error: nodesError } = await supabaseAdmin
      .from('world_map_nodes')
      .delete()
      .eq('map_id', id);

    if (nodesError) {
      throw new Error(`Failed to delete map nodes: ${nodesError.message}`);
    }

    // 4. Delete Map from Database (using Admin client)
    const { error: deleteError } = await supabaseAdmin
      .from('maps')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete map: ${deleteError.message}`);
    }

    // Note: We are not automatically deleting the file from storage here 
    // because we'd need to lookup the path first, and it's safer to keep the asset for now.

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Map delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
