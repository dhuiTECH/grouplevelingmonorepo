import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
  }

  const userId = request.nextUrl.searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_skills')
      .select('skill_id, current_rank')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    
    if (!payload.user_id || !payload.skill_id) {
      return NextResponse.json({ error: 'Missing user_id or skill_id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_skills')
      .upsert({
        user_id: payload.user_id,
        skill_id: payload.skill_id,
        current_rank: payload.current_rank,
        unlocked_at: payload.unlocked_at || new Date().toISOString()
      }, { onConflict: 'user_id,skill_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user skill:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Skills API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
