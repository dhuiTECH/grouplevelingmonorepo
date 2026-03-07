import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { data: tracks, error } = await supabaseAdmin
      .from('game_music')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Admin music fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch music tracks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json()
    const { name, file_url, category } = body

    if (!name || !file_url || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: track, error } = await supabaseAdmin
      .from('game_music')
      .insert([{ name, file_url, category }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ track })
  } catch (error) {
    console.error('Admin music creation error:', error)
    return NextResponse.json({ error: 'Failed to create music track' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
    }

    const { data: track, error } = await supabaseAdmin
      .from('game_music')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ track })
  } catch (error) {
    console.error('Admin music update error:', error)
    return NextResponse.json({ error: 'Failed to update music track' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
    }

    // 1. Fetch Track to get asset URLs before deletion
    const { data: trackData, error: fetchError } = await supabaseAdmin
      .from('game_music')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchError || !trackData) {
      console.warn('⚠️ Could not fetch music track data before delete:', fetchError?.message);
    }

    // 2. Delete from DB
    const { error } = await supabaseAdmin
      .from('game_music')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 3. Cleanup storage assets
    if (trackData?.file_url) {
      const BUCKET = 'game-assets';
      try {
        // Extract path from URL: https://.../storage/v1/object/public/game-assets/path/to/file
        const pathPart = trackData.file_url.split(`/${BUCKET}/`)[1]?.split('?')[0];
        if (pathPart) {
          console.log(`🗑️ Deleting music asset from storage: ${pathPart}`);
          await supabaseAdmin.storage.from(BUCKET).remove([pathPart]);
        }
      } catch (storageErr) {
        console.error(`Failed to delete storage asset ${trackData.file_url}:`, storageErr);
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin music delete error:', error)
    return NextResponse.json({ error: 'Failed to delete music track' }, { status: 500 })
  }
}
