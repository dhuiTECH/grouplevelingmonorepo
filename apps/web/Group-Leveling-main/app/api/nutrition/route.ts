import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    
    // Support bulk insert or single insert
    const itemsToInsert = Array.isArray(payload) ? payload : [payload];
    
    if (itemsToInsert.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const hunterId = itemsToInsert[0].hunter_id;
    if (!hunterId) {
      return NextResponse.json({ error: 'Missing hunter_id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('nutrition_logs')
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error('Error inserting nutrition log(s):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Nutrition API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
  }

  const hunterId = request.nextUrl.searchParams.get('hunter_id');
  const day = request.nextUrl.searchParams.get('day');

  if (!hunterId) {
    return NextResponse.json({ error: 'Missing hunter_id' }, { status: 400 });
  }

  try {
    let query = supabaseAdmin
      .from('nutrition_logs')
      .select('*')
      .eq('hunter_id', hunterId);
    
    if (day) {
      query = query.eq('day_of_week', day);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
  }

  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('nutrition_logs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
