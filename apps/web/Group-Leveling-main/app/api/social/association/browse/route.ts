import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all associations for browsing
    const { data: associations, error } = await supabaseAdmin
      .from('associations')
      .select(`
        id,
        name,
        emblem_url,
        member_count,
        level,
        created_at,
        leader:profiles!leader_id(id, hunter_name, avatar)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching associations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch associations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      associations: associations || []
    });

  } catch (error) {
    console.error('Error in association browse:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}