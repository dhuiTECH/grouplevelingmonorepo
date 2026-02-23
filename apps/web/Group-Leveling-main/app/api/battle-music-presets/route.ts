import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('battle_music_presets')
      .select('id, file_url');

    if (error) {
      console.error('battle_music_presets fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch battle music presets' },
        { status: 500 }
      );
    }

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.file_url) {
        map[row.id as string] = row.file_url as string;
      }
    }

    return NextResponse.json({ presets: map }, { status: 200 });
  } catch (err) {
    console.error('battle_music_presets route error:', err);
    return NextResponse.json(
      { error: 'Unexpected error fetching battle music presets' },
      { status: 500 }
    );
  }
}

