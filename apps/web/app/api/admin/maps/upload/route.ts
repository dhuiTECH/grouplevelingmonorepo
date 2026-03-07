import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

const BUCKET = 'game-assets'
const PREFIX = 'maps'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error ?? 'Unauthorized', details: 'Admin authentication required' },
        { status: auth.status ?? 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const name = formData.get('name')
    const global_x = formData.get('global_x')
    const global_y = formData.get('global_y')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided', details: 'Include a file in the "file" field' },
        { status: 400 }
      )
    }

    if (!name || global_x === null || global_y === null) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'name, global_x, global_y' },
        { status: 400 }
      )
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${PREFIX}/${Date.now()}_${sanitizedName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, file, { 
        upsert: true, 
        contentType: file.type || undefined,
        cacheControl: '31536000'
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        {
          error: 'Storage upload failed',
          details: uploadError.message
        },
        { status: 500 }
      )
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    // Insert map record
    const { error: dbError } = await supabaseAdmin
      .from('maps')
      .insert({
        name,
        global_x: Number(global_x),
        global_y: Number(global_y),
        image_url: publicUrl,
        center_x: 0,
        center_y: 0,
      })

    if (dbError) {
      console.error('Database insert error:', dbError)
      return NextResponse.json(
        {
          error: 'Database insert failed',
          details: dbError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      path: publicUrl,
      url: publicUrl,
      publicUrl
    })
  } catch (err: any) {
    console.error('Map Upload API error:', err)
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: err?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
