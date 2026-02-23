import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Require Supabase Auth - derive userId from authenticated user only
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to perform a summon.' }, { status: 401 });
    }

    const userId = authUser.id;
    const { poolType, useGems } = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Determine cost server-side for security
    const cost = useGems ? 10 : 500;

    // Call the RPC function (userId is from auth, not request body)
    const { data, error } = await supabaseAdmin.rpc('perform_summon', {
      p_user_id: userId,
      p_cost: cost,
      p_use_gems: useGems || false,
      p_pool_type: poolType || 'gate'
    });

    if (error) {
      console.error('RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // The RPC returns the result object directly
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
